import { describe, expect, it } from "vitest";
import { decodeRecord, encodeRecord, getSigningSecret, newCaseId } from "@/lib/share/token";
import { RateLimiter } from "@/lib/rate-limit";
import { collectFootprint } from "@/lib/github/collect";
import { readGitHubConfig } from "@/lib/github/client";
import { createRoast } from "@/lib/roast";
import { buildRecord } from "@/lib/roast/record";
import { fixtureFetch } from "../scripts/mock-github/fixtures.mjs";

const secret = "a".repeat(32);
async function record() {
  const fp = await collectFootprint("lena-bytes", readGitHubConfig({ GITHUB_API_BASE_URL: "http://m" } as unknown as NodeJS.ProcessEnv, fixtureFetch()));
  return buildRecord(fp, await createRoast(fp, "mild", { env: {} as NodeJS.ProcessEnv }), "mild", newCaseId());
}

describe("share tokens", () => {
  it("rejects tampering, wrong secrets and garbage", async () => {
    const t = encodeRecord(await record(), secret);
    const [p, s] = t.split(".");
    const flipped = p.slice(0, 10) + (p[10] === "A" ? "B" : "A") + p.slice(11);
    expect(decodeRecord(`${flipped}.${s}`, secret)).toBeNull();
    expect(decodeRecord(t, "b".repeat(32))).toBeNull();
    expect(decodeRecord("garbage", secret)).toBeNull();
    expect(decodeRecord("", secret)).toBeNull();
    expect(decodeRecord(t, null)).toBeNull();
  });
  it("case ids look right", () => expect(newCaseId()).toMatch(/^RR-[A-Z0-9]{6}$/));
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
    expect(rl.check("a", 20).ok).toBe(false);
    expect(rl.check("b", 20).ok).toBe(true);
    expect(rl.check("a", 1001).ok).toBe(true);
  });
});
