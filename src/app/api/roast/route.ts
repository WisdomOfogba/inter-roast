import { NextResponse } from "next/server";
import { z } from "zod";
import { INTENSITIES } from "@/types/roast";
import type { StageEvent } from "@/types/github";
import { parseGitHubProfile } from "@/lib/github/url";
import { readGitHubConfig, GitHubError, githubTag } from "@/lib/github/client";
import { revalidateTag, unstable_cache } from "next/cache";
import { collectFootprint } from "@/lib/github/collect";
import { getRoastCached } from "@/lib/roast/cache";
import { createRoast } from "@/lib/roast";
import { buildRecord } from "@/lib/roast/record";
import { encodeRecord, getSigningSecret, newCaseId } from "@/lib/share/token";
import { saveRecord } from "@/lib/share/store";
import { clientKey, RateLimiter } from "@/lib/rate-limit";

/**
 * POST { profile, intensity } → NDJSON stream:
 *   {"type":"stage","stage":"profile","status":"start"} … one line per real step
 *   {"type":"result","token":"…","source":"gemini"|"engine"}
 *   {"type":"error","code":"not_found"|…,"message":"…","resetAt"?:number}
 * Validation and rate-limit failures return a plain JSON error before streaming.
 */

const bodySchema = z.object({
  profile: z.string().max(200),
  intensity: z.enum(INTENSITIES).default("spicy"),
  /** Bypass cached GitHub data and cached roasts for this profile. */
  refresh: z.boolean().optional().default(false),
});

/** One forced refresh per profile per minute (per instance), so refresh can't be used to drain the GitHub quota. */
const lastRefresh = new Map<string, number>();
const REFRESH_COOLDOWN_MS = 60_000;

const perMinute = Number(process.env.ROAST_RATE_LIMIT_PER_MINUTE) || 4;
const limiter = new RateLimiter([
  { limit: perMinute, windowMs: 60_000 },
  { limit: Math.max(25, perMinute * 6), windowMs: 24 * 60 * 60_000 },
]);

const jsonError = (status: number, code: string, message: string, headers?: HeadersInit) =>
  NextResponse.json({ type: "error", code, message }, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) return jsonError(415, "invalid", "Send JSON.");

  let body: z.output<typeof bodySchema>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return jsonError(413, "invalid", "Request too large.");
    const parsed = bodySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return jsonError(400, "invalid", "Send a GitHub profile link and a heat level.");
    body = parsed.data;
  } catch {
    return jsonError(400, "invalid", "Couldn't read that request.");
  }

  const profile = parseGitHubProfile(body.profile);
  if (!profile.ok) return jsonError(400, "invalid_url", profile.error);

  const secret = getSigningSecret();
  if (!secret) {
    console.error("[roast] Set ROAST_SIGNING_SECRET (or GEMINI_API_KEY) to enable roasts in production.");
    return jsonError(503, "config", "RepoRiot isn't fully configured yet. Try again later.");
  }

  const rl = limiter.check(clientKey(request.headers));
  if (!rl.ok) return jsonError(429, "too_many", `Slow down. You can roast again in ${rl.retryAfterSec}s.`, { "Retry-After": String(rl.retryAfterSec) });

  let refreshed = false;
  if (body.refresh) {
    const key = profile.username.toLowerCase();
    const last = lastRefresh.get(key) ?? 0;
    if (Date.now() - last >= REFRESH_COOLDOWN_MS) {
      lastRefresh.set(key, Date.now());
      if (lastRefresh.size > 2000) lastRefresh.delete(lastRefresh.keys().next().value!);
      // expire: 0 => the next read is a blocking refetch from GitHub, not stale data.
      revalidateTag(githubTag(profile.username), { expire: 0 });
      refreshed = true;
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const emit = (e: StageEvent) => send(e);
        if (body.refresh && !refreshed) {
          send({ type: "note", message: "This profile was refreshed under a minute ago, so we're using that data." });
        }
        const ghConfig = readGitHubConfig();
        if (ghConfig.cacheSeconds) {
          ghConfig.memo = (key, tags, fn) => unstable_cache(fn, key, { revalidate: ghConfig.cacheSeconds * 4, tags })();
        }
        const fp = await collectFootprint(profile.username, ghConfig, emit);

        emit({ type: "stage", stage: "roast", status: "start" });
        const { outcome, reused } = await getRoastCached(fp, body.intensity, () => createRoast(fp, body.intensity));
        const record = buildRecord(fp, outcome, body.intensity, newCaseId());
        const mins = Math.max(1, Math.round((Date.now() - outcome.generatedAt) / 60_000));
        emit({
          type: "stage",
          stage: "roast",
          status: "done",
          detail: reused
            ? `Reusing the Gemini roast written ${mins} min ago for this exact data`
            : outcome.source === "gemini"
              ? "Roast written by Gemini"
              : "Roast written by the rules engine",
        });
        // Short link when a store is configured; otherwise the long self-contained signed link.
        const id = await saveRecord(record);
        const path = `/r/${id ?? encodeRecord(record, secret)}`;
        send({ type: "result", path, source: outcome.source, fallbackReason: outcome.fallbackReason ?? null });
      } catch (err) {
        if (err instanceof GitHubError) {
          send({ type: "error", code: err.code, message: err.message, ...(err.resetAt ? { resetAt: err.resetAt } : {}) });
        } else {
          console.error("[roast] unexpected failure", err instanceof Error ? err.message : "unknown");
          send({ type: "error", code: "internal", message: "Something broke on our side. Try again in a moment." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
