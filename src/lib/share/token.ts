import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { z } from "zod";
import { INTENSITIES, type RoastRecord } from "@/types/roast";

/**
 * Share links carry the generated roast plus the public GitHub data it cites,
 * compressed and HMAC-signed so nobody can mint fake roasts on our domain.
 * Format: base64url(deflateRaw(json)) + "." + base64url(hmac[0..16])
 */

const MAX_TOKEN_LENGTH = 12_000;

/** The HMAC already proves we wrote it; this guards shape and version. */
export const recordSchema = z
  .object({
    v: z.literal(2),
    caseId: z.string().regex(/^[A-Z0-9-]{4,16}$/),
    intensity: z.enum(INTENSITIES),
    profile: z.object({ login: z.string().regex(/^[A-Za-z0-9-]{1,39}$/), id: z.number().int() }).passthrough(),
    result: z.object({
      headline: z.string(),
      archetype: z.string(),
      summary: z.string(),
      mainRoast: z.string(),
      comments: z.array(z.object({ category: z.string(), title: z.string(), roast: z.string(), evidence: z.array(z.object({ kind: z.string(), ref: z.string() })) })).min(1).max(6),
      closingLine: z.string(),
    }),
    facts: z.array(z.any()),
    repos: z.array(z.any()),
    readmes: z.array(z.any()),
    commits: z.array(z.any()),
    languages: z.array(z.any()),
    pinned: z.array(z.string()).nullable(),
    dataAsOf: z.string().optional(),
    source: z.enum(["gemini", "engine"]),
    model: z.string().max(60).optional(),
    fallbackReason: z.enum(["unconfigured", "quota", "unavailable", "invalid_output", "blocked"]).optional(),
    createdAt: z.number().int().positive(),
  })
  .passthrough();

const DEV_SECRET = "reporiot-dev-secret-do-not-use-in-production";

/**
 * Signing secret: ROAST_SIGNING_SECRET, else derived from GEMINI_API_KEY (so a
 * one-variable deploy still gets unforgeable links), else a dev-only constant.
 * Returns null in production with neither set: sharing links are disabled.
 */
export function getSigningSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.ROAST_SIGNING_SECRET && env.ROAST_SIGNING_SECRET.length >= 16) return env.ROAST_SIGNING_SECRET;
  if (env.GEMINI_API_KEY) {
    return createHash("sha256").update("internet-roast/share-signing/v1:" + env.GEMINI_API_KEY).digest("hex");
  }
  if (env.NODE_ENV !== "production" || env.ROAST_ALLOW_DEV_SECRET === "1") return DEV_SECRET;
  return null;
}

const sign = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest().subarray(0, 16).toString("base64url");

export function encodeRecord(record: RoastRecord, secret: string): string {
  const payload = deflateRawSync(Buffer.from(JSON.stringify(record), "utf8"), { level: 9 }).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeRecord(token: string, secret: string | null): RoastRecord | null {
  if (!secret || !token || token.length > MAX_TOKEN_LENGTH) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(token);
    } catch {
      return token;
    }
  })();
  const [payload, sig] = decoded.split(".");
  if (!payload || !sig || !/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(sig)) return null;
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const json = inflateRawSync(Buffer.from(payload, "base64url"), { maxOutputLength: 64_000 }).toString("utf8");
    const parsed = recordSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    return parsed.data as unknown as RoastRecord;
  } catch {
    return null;
  }
}

export function newCaseId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const s = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `RR-${s}`;
}
