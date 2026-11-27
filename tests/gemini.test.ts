import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@google/genai";
import { createRoast, _resetCooldowns } from "@/lib/roast-engine";
import { prepareSubmission } from "@/lib/validation/prepare";
import { parseModelOutput, InvalidOutputError, BlockedOutputError } from "@/lib/validation/roast-output";
import { buildUserPrompt } from "@/lib/gemini/prompt";
import type { GenerateClient } from "@/lib/gemini/client";
import { SAMPLES } from "@/lib/samples";

const sub = prepareSubmission({ handle: "tester", bio: "", content: SAMPLES.tech, context: "" });
const env = { GEMINI_API_KEY: "test-key", NODE_ENV: "test" } as unknown as NodeJS.ProcessEnv;

const good = {
  personalityTitle: "The Borrow-Checker Evangelist",
  personalityDescription: "Treats every thread like a code review nobody requested.",
  headline: "I USE ARCH AND I WILL TELL YOU",
  mainRoast:
    "You told a stranger the borrow checker isn't hard, which is the programming equivalent of saying a marathon is just walking but faster. Then you spent a weekend on your neovim config instead of the project, which is like repainting the car instead of driving it anywhere. Correction: the bottleneck is you.",
  observations: [
    "You said 'Source? Literally the definition.' as if that settles anything.",
    "Rebuilt neovim instead of the actual project. Priorities: compiled.",
    "You're tired of pretending about tabs vs spaces. We're tired too.",
  ],
  personalityTraits: ["Well-actually", "Config tinkerer", "Arch evangelism"],
  behaviourClass: "Comment-Section Litigator, Class II",
  indicators: [
    { label: "Pedantry", level: 5 },
    { label: "Config hours", level: 4 },
    { label: "Touching grass", level: 1 },
  ],
  roastScore: 4.2, // outside the savage band, should be clamped
  roastIntensity: "playful", // wrong, should be overridden
  closingStatement: "Your code compiles. Your social life throws warnings.",
};

const client = (impl: (model: string) => unknown): GenerateClient & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    models: {
      generateContent: vi.fn(async (req: { model: string }) => {
        calls.push(req.model);
        return impl(req.model);
      }) as unknown as GenerateClient["models"]["generateContent"],
    },
  };
};
const okResponse = (body: unknown) => ({ text: JSON.stringify(body), candidates: [{ finishReason: "STOP" }] });
const quotaError = () => new ApiError({ message: '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","details":[{"retryDelay":"30s"}]}}', status: 429 });

beforeEach(() => _resetCooldowns());

describe("parseModelOutput", () => {
  it("accepts valid JSON, overrides intensity and clamps score", () => {
    const r = parseModelOutput(JSON.stringify(good), "savage");
    expect(r.roastIntensity).toBe("savage");
    expect(r.roastScore).toBeGreaterThanOrEqual(8.5);
  });
  it("accepts JSON wrapped in code fences", () => {
    expect(() => parseModelOutput("```json\n" + JSON.stringify(good) + "\n```", "brutal")).not.toThrow();
  });
  it.each([
    ["not json", "lol here's your roast"],
    ["empty", ""],
    ["missing field", JSON.stringify({ ...good, mainRoast: undefined })],
    ["two observations", JSON.stringify({ ...good, observations: good.observations.slice(0, 2) })],
    ["oversized", JSON.stringify({ ...good, mainRoast: "x".repeat(5000) })],
    ["bad indicator", JSON.stringify({ ...good, indicators: [{ label: "x", level: 9 }, good.indicators[1], good.indicators[2]] })],
  ])("rejects %s", (_n, raw) => {
    expect(() => parseModelOutput(raw, "brutal")).toThrow(InvalidOutputError);
  });
  it("blocks denylisted output", () => {
    expect(() => parseModelOutput(JSON.stringify({ ...good, closingStatement: "Honestly just kys, nobody cares." }), "savage")).toThrow(BlockedOutputError);
  });
});

describe("createRoast with Gemini", () => {
  it("uses the local engine when no key is configured", async () => {
    const out = await createRoast(sub, "brutal", { env: {} as NodeJS.ProcessEnv });
    expect(out.source).toBe("engine");
    expect(out.fallbackReason).toBe("unconfigured");
  });

  it("returns Gemini output when valid", async () => {
    const c = client(() => okResponse(good));
    const out = await createRoast(sub, "savage", { env, client: c });
    expect(out.source).toBe("gemini");
    expect(out.model).toBe("gemini-3.8-flash");
    expect(out.result.personalityTitle).toBe("The Borrow-Checker Evangelist");
    expect(c.calls).toEqual(["gemini-3.8-flash"]);
  });

  it("falls back to the engine on malformed output without retrying", async () => {
    const c = client(() => ({ text: "{ nope", candidates: [{ finishReason: "STOP" }] }));
    const out = await createRoast(sub, "brutal", { env, client: c });
    expect(out.source).toBe("engine");
    expect(out.fallbackReason).toBe("invalid_output");
    expect(c.calls).toHaveLength(1);
  });

  it("on 429 tries the free fallback model once, then cools down", async () => {
    let t = 1_000_000;
    const now = () => t;
    const c = client((model) => {
      if (model === "gemini-3.8-flash") throw quotaError();
      return okResponse(good);
    });
    const out = await createRoast(sub, "brutal", { env, client: c, now });
    expect(out.source).toBe("gemini");
    expect(out.model).toBe("gemini-3.5-flash-lite");
    expect(c.calls).toEqual(["gemini-3.8-flash", "gemini-3.5-flash-lite"]);

    // primary is cooling down: not called again
    await createRoast(sub, "brutal", { env, client: c, now });
    expect(c.calls).toEqual(["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash-lite"]);

    // after retryDelay (30s), primary is tried again
    t += 31_000;
    await createRoast(sub, "brutal", { env, client: c, now });
    expect(c.calls.at(-2)).toBe("gemini-3.8-flash");
  });

  it("reports quota exhaustion when every model is rate-limited", async () => {
    const c = client(() => {
      throw quotaError();
    });
    const out = await createRoast(sub, "playful", { env, client: c });
    expect(out.source).toBe("engine");
    expect(out.fallbackReason).toBe("quota");
  });

  it("does not hop models on non-quota API failures", async () => {
    const c = client(() => {
      throw new ApiError({ message: "internal", status: 500 });
    });
    const out = await createRoast(sub, "playful", { env, client: c });
    expect(out.fallbackReason).toBe("unavailable");
    expect(c.calls).toHaveLength(1);
  });

  it("handles network errors", async () => {
    const c = client(() => {
      throw new TypeError("fetch failed");
    });
    const out = await createRoast(sub, "playful", { env, client: c });
    expect(out.source).toBe("engine");
    expect(out.fallbackReason).toBe("unavailable");
  });

  it("treats safety-blocked responses as blocked", async () => {
    const c = client(() => ({ text: undefined, candidates: [{ finishReason: "SAFETY" }] }));
    const out = await createRoast(sub, "savage", { env, client: c });
    expect(out.fallbackReason).toBe("blocked");
  });

  it("treats truncated responses as invalid", async () => {
    const c = client(() => ({ text: '{"personalityTitle": "The', candidates: [{ finishReason: "MAX_TOKENS" }] }));
    const out = await createRoast(sub, "savage", { env, client: c });
    expect(out.fallbackReason).toBe("invalid_output");
  });
});

describe("prompt", () => {
  it("changes with intensity and fences the submission", () => {
    const p = buildUserPrompt(sub, "playful");
    const s = buildUserPrompt(sub, "savage");
    expect(p).toContain("INTENSITY: PLAYFUL");
    expect(s).toContain("INTENSITY: SAVAGE");
    expect(s).toMatch(/<submission>[\s\S]*<\/submission>/);
    expect(s).toContain("nothing was fetched from Reddit");
  });
  it("flags thin submissions", () => {
    const thin = prepareSubmission({ handle: null, bio: "", content: SAMPLES.sparse, context: "" });
    expect(buildUserPrompt(thin, "brutal")).toContain("THIN SUBMISSION");
  });
});
