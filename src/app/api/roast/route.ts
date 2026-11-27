import { NextResponse } from "next/server";
import { z } from "zod";
import { INTENSITIES } from "@/types/roast";
import type { StageEvent } from "@/types/github";
import { parseGitHubProfile } from "@/lib/github/url";
import { readGitHubConfig, GitHubError } from "@/lib/github/client";
import { cachedFootprint, collectFootprint, storeFootprint } from "@/lib/github/collect";
import { createRoast } from "@/lib/roast";
import { buildRecord } from "@/lib/roast/record";
import { encodeRecord, getSigningSecret, newCaseId } from "@/lib/share/token";
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
});

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const emit = (e: StageEvent) => send(e);
        let fp = cachedFootprint(profile.username);
        if (fp) {
          const cached = fp;
          // Data is reused from a fetch in the last 15 minutes; say so honestly.
          (["profile", "repos", "readmes", "activity"] as const).forEach((stage) =>
            emit({ type: "stage", stage, status: "done", detail: stage === "profile" ? `Using @${cached.profile.login}'s data fetched in the last 15 minutes` : undefined }),
          );
        } else {
          fp = await collectFootprint(profile.username, readGitHubConfig(), emit);
          storeFootprint(fp);
        }

        emit({ type: "stage", stage: "roast", status: "start" });
        const outcome = await createRoast(fp, body.intensity);
        const record = buildRecord(fp, outcome, body.intensity, newCaseId());
        emit({ type: "stage", stage: "roast", status: "done", detail: outcome.source === "gemini" ? "Roast written by Gemini" : "Roast written by the rules engine" });
        send({ type: "result", token: encodeRecord(record, secret), source: outcome.source, fallbackReason: outcome.fallbackReason ?? null });
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
