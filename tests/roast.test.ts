import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@google/genai";
import { collectFootprint } from "@/lib/github/collect";
import { readGitHubConfig } from "@/lib/github/client";
import { createRoast, _resetCooldowns } from "@/lib/roast";
import { generateEngineRoast } from "@/lib/roast/engine";
import { buildRecord } from "@/lib/roast/record";
import { groundComments, parseModelOutput, roastOutputSchema, InvalidOutputError } from "@/lib/validation/roast-output";
import { buildUserPrompt } from "@/lib/gemini/prompt";
import { decodeRecord, encodeRecord } from "@/lib/share/token";
import type { GenerateClient } from "@/lib/gemini/client";
import type { Footprint } from "@/types/github";
import { INTENSITIES } from "@/types/roast";
import { fixtureFetch } from "../scripts/mock-github/fixtures.mjs";

const load = (u: string) => collectFootprint(u, readGitHubConfig({ GITHUB_API_BASE_URL: "http://mock" } as unknown as NodeJS.ProcessEnv, fixtureFetch()));
let rich: Footprint;
let empty: Footprint;
beforeEach(async () => {
  _resetCooldowns();
  rich = await load("lena-bytes");
  empty = await load("empty-octo");
});

const env = { GEMINI_API_KEY: "k" } as unknown as NodeJS.ProcessEnv;
const good = {
  headline: "Sixteen repos and a Create React App README walk into a bar",
  archetype: "The Framework Sommelier",
  summary: "Changes requested: the graveyard is growing and the READMEs are still on factory settings.",
  mainRoast:
    "You shipped snippetbox, a genuinely useful Go CLI with 412 stars, and then spent the next three years building todo-app-final-v2 with the Create React App README still in place. Your commit history reads 'update', 'fix', 'final fix', which is less a changelog and more a cry for help.",
  comments: [
    { category: "readme", title: "Factory-settings README", roast: "todo-app-final-v2 still ships the Create React App README. The docs were written by a CLI.", evidence: [{ kind: "readme", ref: "todo-app-final-v2" }, { kind: "fact", ref: "readme_template" }] },
    { category: "activity", title: "git commit -m update", roast: "Your recent commits say 'update' and 'fix'. Riveting.", evidence: [{ kind: "commit", ref: "c1" }, { kind: "commit", ref: "c2" }] },
    { category: "stars", title: "One banger", roast: "snippetbox carries the profile.", evidence: [{ kind: "repo", ref: "lena-bytes/snippetbox" }] },
    { category: "graveyard", title: "Ghost repos", roast: "This cites a repo that doesn't exist and should be dropped.", evidence: [{ kind: "repo", ref: "imaginary-repo" }] },
  ],
  closingLine: "Changes requested. Please rebase your ambitions onto main.",
};
const client = (impl: (model: string) => unknown) => {
  const calls: string[] = [];
  return {
    calls,
    models: { generateContent: vi.fn(async (req: { model: string }) => { calls.push(req.model); return impl(req.model); }) as unknown as GenerateClient["models"]["generateContent"] },
  };
};
const ok = (b: unknown) => ({ text: JSON.stringify(b), candidates: [{ finishReason: "STOP" }] });

describe("evidence grounding", () => {
  it("keeps real evidence, normalizes owner/repo, drops invented refs", () => {
    const r = parseModelOutput(JSON.stringify(good), rich);
    expect(r.comments.map((c) => c.category)).toEqual(["readme", "activity", "stars"]);
    expect(r.comments[2].evidence[0].ref).toBe("snippetbox");
  });
  it("rejects output with fewer than 2 grounded comments", () => {
    const bad = { ...good, comments: good.comments.map((c) => ({ ...c, evidence: [{ kind: "repo", ref: "nope" }] })) };
    expect(() => parseModelOutput(JSON.stringify(bad), rich)).toThrow(InvalidOutputError);
  });
  it.each([["not json", "{nope"], ["empty", ""], ["missing fields", JSON.stringify({ headline: "x" })]])("rejects %s", (_n, raw) => {
    expect(() => parseModelOutput(raw, rich)).toThrow(InvalidOutputError);
  });
  it("dedupes categories", () => {
    const c = groundComments([good.comments[0], good.comments[0]] as never, rich);
    expect(c).toHaveLength(1);
  });
});

describe("createRoast", () => {
  it("uses the rules engine without a key, labelled", async () => {
    const out = await createRoast(rich, "spicy", { env: {} as NodeJS.ProcessEnv });
    expect(out).toMatchObject({ source: "engine", fallbackReason: "unconfigured" });
  });
  it("returns validated Gemini output", async () => {
    const c = client(() => ok(good));
    const out = await createRoast(rich, "scorched", { env, client: c });
    expect(out.source).toBe("gemini");
    expect(c.calls).toEqual(["gemini-3.8-flash"]);
  });
  it("falls back to engine on malformed output, without retrying", async () => {
    const c = client(() => ({ text: "{", candidates: [{ finishReason: "STOP" }] }));
    const out = await createRoast(rich, "spicy", { env, client: c });
    expect(out).toMatchObject({ source: "engine", fallbackReason: "invalid_output" });
    expect(c.calls).toHaveLength(1);
  });
  it("on 429 tries one free fallback model, then reports quota", async () => {
    const c = client(() => { throw new ApiError({ message: "RESOURCE_EXHAUSTED", status: 429 }); });
    const out = await createRoast(rich, "spicy", { env, client: c });
    expect(c.calls).toEqual(["gemini-3.8-flash", "gemini-3.5-flash-lite"]);
    expect(out.fallbackReason).toBe("quota");
  });
  it("treats safety blocks and outages distinctly", async () => {
    expect((await createRoast(rich, "spicy", { env, client: client(() => ({ candidates: [{ finishReason: "SAFETY" }] })) })).fallbackReason).toBe("blocked");
    expect((await createRoast(rich, "spicy", { env, client: client(() => { throw new ApiError({ message: "x", status: 500 }); }) })).fallbackReason).toBe("unavailable");
  });
});

describe("rules engine", () => {
  it("produces grounded, schema-valid roasts for every heat level", () => {
    for (const fp of [rich, empty]) {
      for (const h of INTENSITIES) {
        const r = generateEngineRoast(fp, h);
        expect(roastOutputSchema.extend({ comments: roastOutputSchema.shape.comments.unwrap().array().min(1) }).safeParse(r).success).toBe(true);
        expect(groundComments(r.comments, fp)).toHaveLength(r.comments.length);
      }
    }
  });
  it("finds the real issues in the rich fixture", () => {
    const cats = generateEngineRoast(rich, "spicy").comments.map((c) => c.category);
    expect(cats).toEqual(expect.arrayContaining(["graveyard", "readme", "activity"]));
  });
  it("roasts the empty profile honestly", () => {
    const r = generateEngineRoast(empty, "scorched");
    expect(r.mainRoast).toMatch(/no public repos/);
  });
});

describe("prompt + share record", () => {
  it("includes facts, fences untrusted data, and flags missing pinned data", () => {
    const p = buildUserPrompt(rich, "mild");
    expect(p).toContain("HEAT: MILD");
    expect(p).toMatch(/<github_data>[\s\S]*<\/github_data>/);
    expect(p).toContain("stale_repos:");
    expect(p).toContain("Pinned repos: NOT RETRIEVED");
    expect(buildUserPrompt(rich, "scorched")).toContain("HEAT: SCORCHED");
  });
  it("every engine roast (all profiles, all heats) produces a decodable link", async () => {
    for (const fp of [rich, empty]) {
      for (const h of INTENSITIES) {
        const out = await createRoast(fp, h, { env: {} as NodeJS.ProcessEnv });
        const t = encodeRecord(buildRecord(fp, out, h, "RR-TEST02"), "s".repeat(32));
        expect(decodeRecord(t, "s".repeat(32))).not.toBeNull();
      }
    }
  });
  it("round-trips a compact signed record", async () => {
    const out = await createRoast(rich, "spicy", { env: {} as NodeJS.ProcessEnv });
    const rec = buildRecord(rich, out, "spicy", "RR-TEST01");
    const token = encodeRecord(rec, "s".repeat(32));
    expect(token.length).toBeLessThan(6000);
    expect(decodeRecord(token, "s".repeat(32))).toEqual(rec);
    expect(decodeRecord(token, "x".repeat(32))).toBeNull();
  });
});
