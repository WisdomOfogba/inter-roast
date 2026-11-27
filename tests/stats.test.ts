import { describe, expect, it } from "vitest";
import { getStore } from "@/lib/share/store";
import { readStats, recordRoast, statsKeyOk } from "@/lib/stats";

const fresh = () => {
  const g = globalThis as unknown as { __reporiotStore?: unknown; __reporiotSets?: unknown };
  delete g.__reporiotStore;
  delete g.__reporiotSets;
  return getStore({ NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv)!;
};
const T = Date.UTC(2026, 10, 27, 12);

describe("usage stats", () => {
  it("counts roasts, unique profiles (case-insensitive), sources, days and top profiles", async () => {
    const store = fresh();
    await recordRoast({ login: "Octocat", source: "gemini", intensity: "spicy" }, store, T);
    await recordRoast({ login: "octocat", source: "gemini", intensity: "mild" }, store, T);
    await recordRoast({ login: "lena-bytes", source: "engine", intensity: "spicy" }, store, T - 86_400_000);
    const s = (await readStats(store, T))!;
    expect(s.totals).toEqual({ roasts: 3, uniqueProfiles: 2, byGemini: 2, byRulesEngine: 1 });
    expect(s.last14Days[0]).toEqual({ date: "2026-11-27", roasts: 2, uniqueProfiles: 1 });
    expect(s.last14Days[1]).toEqual({ date: "2026-11-26", roasts: 1, uniqueProfiles: 1 });
    expect(s.last14Days).toHaveLength(14);
    expect(s.topProfiles[0]).toEqual({ login: "octocat", roasts: 2 });
  });

  it("sends one Upstash /pipeline request per roast", async () => {
    const reqs: { url: string; body: unknown }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      reqs.push({ url, body: JSON.parse(String(init.body)) });
      return Response.json((JSON.parse(String(init.body)) as unknown[]).map(() => ({ result: 1 })));
    }) as unknown as typeof fetch;
    const store = getStore({ KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t", NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv, f)!;
    await recordRoast({ login: "x", source: "gemini", intensity: "spicy" }, store, T);
    expect(reqs).toHaveLength(1);
    expect(reqs[0].url).toBe("https://kv.example/pipeline");
    expect(reqs[0].body).toContainEqual(["PFADD", "stats:profiles", "x"]);
  });

  it("never throws into the roast when the store is down", async () => {
    const f = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    const store = getStore({ KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t", NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv, f)!;
    await expect(recordRoast({ login: "x", source: "gemini", intensity: "spicy" }, store)).resolves.toBeUndefined();
  });

  it("guards the stats page with STATS_KEY", () => {
    const env = { STATS_KEY: "a-long-secret-key" } as unknown as NodeJS.ProcessEnv;
    expect(statsKeyOk("a-long-secret-key", env)).toBe(true);
    expect(statsKeyOk("wrong", env)).toBe(false);
    expect(statsKeyOk(null, env)).toBe(false);
    expect(statsKeyOk("anything", {} as NodeJS.ProcessEnv)).toBe(false); // disabled when unset
    expect(statsKeyOk("short", { STATS_KEY: "short" } as unknown as NodeJS.ProcessEnv)).toBe(false); // too short to be safe
  });

  it.runIf(process.env.TEST_REDIS_URL)("works against a real Redis server", async () => {
    const store = getStore({ REDIS_URL: process.env.TEST_REDIS_URL, NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)!;
    await store.pipeline([["DEL", "stats:roasts", "stats:profiles", "stats:top", "stats:source:gemini"]]);
    await recordRoast({ login: "A", source: "gemini", intensity: "spicy" }, store);
    await recordRoast({ login: "b", source: "gemini", intensity: "spicy" }, store);
    await recordRoast({ login: "a", source: "gemini", intensity: "spicy" }, store);
    const s = (await readStats(store))!;
    expect(s.totals.roasts).toBe(3);
    expect(s.totals.uniqueProfiles).toBe(2);
    expect(s.topProfiles[0]).toEqual({ login: "a", roasts: 2 });
  });
});
