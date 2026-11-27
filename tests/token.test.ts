import { describe, expect, it } from "vitest";
import { decodeRecord, encodeRecord, getSigningSecret, newCaseId } from "@/lib/share/token";
import { generateLocalRoast } from "@/lib/roast-engine";
import { prepareSubmission } from "@/lib/validation/prepare";
import { SAMPLES } from "@/lib/samples";
import type { RoastRecord } from "@/types/roast";
import { RateLimiter } from "@/lib/rate-limit";

const record: RoastRecord = {
  v: 1,
  caseId: newCaseId(),
  handle: "tester",
  result: generateLocalRoast(prepareSubmission({ handle: "tester", bio: "", content: SAMPLES.finance, context: "" }), "savage"),
  source: "engine",
  fallbackReason: "unconfigured",
  sparse: false,
  createdAt: Date.now(),
};
const secret = "a".repeat(32);

describe("share tokens", () => {
  it("round-trips", () => {
    const t = encodeRecord(record, secret);
    expect(decodeRecord(t, secret)).toEqual(record);
    expect(t.length).toBeLessThan(2500);
  });
  it("rejects tampering and wrong secrets", () => {
    const t = encodeRecord(record, secret);
    const [p, s] = t.split(".");
    const flipped = p.slice(0, 10) + (p[10] === "A" ? "B" : "A") + p.slice(11);
    expect(decodeRecord(`${flipped}.${s}`, secret)).toBeNull();
    expect(decodeRecord(t, "b".repeat(32))).toBeNull();
    expect(decodeRecord("garbage", secret)).toBeNull();
    expect(decodeRecord("", secret)).toBeNull();
    expect(decodeRecord(t, null)).toBeNull();
  });
  it("never contains the raw submission fields", () => {
    expect(Object.keys(record)).not.toContain("content");
  });
  it("derives secrets sensibly", () => {
    expect(getSigningSecret({ NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(getSigningSecret({ NODE_ENV: "production", GEMINI_API_KEY: "k" } as unknown as NodeJS.ProcessEnv)).toMatch(/^[a-f0-9]{64}$/);
    expect(getSigningSecret({ NODE_ENV: "production", ROAST_SIGNING_SECRET: "x".repeat(20) } as unknown as NodeJS.ProcessEnv)).toBe("x".repeat(20));
    expect(getSigningSecret({ NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv)).toBeTruthy();
  });
});

describe("rate limiter", () => {
  it("limits per key per window", () => {
    const rl = new RateLimiter([{ limit: 2, windowMs: 1000 }]);
    expect(rl.check("a", 0).ok).toBe(true);
    expect(rl.check("a", 10).ok).toBe(true);
    const third = rl.check("a", 20);
    expect(third.ok).toBe(false);
    expect(rl.check("b", 20).ok).toBe(true);
    expect(rl.check("a", 1001).ok).toBe(true);
  });
});
