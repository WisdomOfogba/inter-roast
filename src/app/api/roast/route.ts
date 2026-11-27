import { NextResponse } from "next/server";
import { roastRequestSchema } from "@/lib/validation/input";
import { prepareSubmission } from "@/lib/validation/prepare";
import { createRoast } from "@/lib/roast-engine";
import { encodeRecord, getSigningSecret, newCaseId } from "@/lib/share/token";
import { clientKey, RateLimiter } from "@/lib/rate-limit";
import type { RoastRecord } from "@/types/roast";

const MAX_BODY_BYTES = 16_000;

const limiter = new RateLimiter([
  { limit: 5, windowMs: 60_000 },
  { limit: 30, windowMs: 24 * 60 * 60_000 },
]);

function error(status: number, message: string, extra: Record<string, unknown> = {}, headers?: HeadersInit) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return error(415, "Send JSON.");
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return error(413, "That's a lot of receipts. Trim it down a bit.");

  const secret = getSigningSecret();
  if (!secret) {
    console.error("[roast] Set ROAST_SIGNING_SECRET (or GEMINI_API_KEY) to enable roasts in production.");
    return error(503, "Roasting is temporarily offline (server configuration). Try again later.");
  }

  const rl = limiter.check(clientKey(request.headers));
  if (!rl.ok) {
    return error(
      429,
      `Easy. Even roasters need a breather. Try again in ${rl.retryAfterSec}s.`,
      { retryAfter: rl.retryAfterSec },
      { "Retry-After": String(rl.retryAfterSec) },
    );
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return error(413, "That's a lot of receipts. Trim it down a bit.");
    body = JSON.parse(raw);
  } catch {
    return error(400, "Couldn't read that request.");
  }

  const parsed = roastRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return error(400, Object.values(fieldErrors)[0] ?? "Invalid input.", { fieldErrors });
  }

  const { handle, bio, content, context, intensity } = parsed.data;
  const submission = prepareSubmission({ handle, bio, content, context });

  const outcome = await createRoast(submission, intensity);

  const record: RoastRecord = {
    v: 1,
    caseId: newCaseId(),
    handle,
    result: outcome.result,
    source: outcome.source,
    ...(outcome.model ? { model: outcome.model } : {}),
    ...(outcome.fallbackReason ? { fallbackReason: outcome.fallbackReason } : {}),
    sparse: submission.stats.sparse,
    createdAt: Date.now(),
  };

  // Nothing about the submission is stored or logged; only the generated roast leaves.
  return NextResponse.json(
    { token: encodeRecord(record, secret), source: record.source, fallbackReason: record.fallbackReason ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
