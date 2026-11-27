import { describe, expect, it } from "vitest";
import { getStore, loadRecord, newShortId, saveRecord, SHORT_ID } from "@/lib/share/store";
import { collectFootprint } from "@/lib/github/collect";
import { readGitHubConfig } from "@/lib/github/client";
import { createRoast } from "@/lib/roast";
import { buildRecord } from "@/lib/roast/record";
import { fixtureFetch } from "../scripts/mock-github/fixtures.mjs";

async function record() {
  const fp = await collectFootprint("lena-bytes", readGitHubConfig({} as NodeJS.ProcessEnv, fixtureFetch()));
  return buildRecord(fp, await createRoast(fp, "spicy", { env: {} as NodeJS.ProcessEnv }), "spicy", "RR-STORE1");
}

/** Minimal Upstash REST emulation: POST [cmd, ...args] → {result}. */
function fakeUpstash(opts: { failSets?: number; down?: boolean } = {}) {
  const data = new Map<string, string>();
  const calls: unknown[][] = [];
  let failSets = opts.failSets ?? 0;
  const f = (async (_url: string, init: RequestInit) => {
    if (opts.down) throw new TypeError("fetch failed");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer tok");
    const cmd = JSON.parse(String(init.body)) as string[];
    calls.push(cmd);
    if (cmd[0] === "SET") {
      if (failSets > 0) { failSets--; return Response.json({ result: null }); } // NX collision
      if (data.has(cmd[1])) return Response.json({ result: null });
      data.set(cmd[1], cmd[2]);
      return Response.json({ result: "OK" });
    }
    if (cmd[0] === "GET") return Response.json({ result: data.get(cmd[1]) ?? null });
    return Response.json({ error: "unknown" }, { status: 400 });
  }) as unknown as typeof fetch;
  return { f, data, calls };
}
const env = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "tok", NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv;

describe("short share links", () => {
  it("makes readable ids tied to the login", () => {
    const id = newShortId("Lena-Bytes");
    expect(id).toMatch(/^lena-bytes-[a-z2-9]{6}$/);
    expect(SHORT_ID.test(id)).toBe(true);
    expect(SHORT_ID.test("x.y")).toBe(false);
  });

  it("stores and loads a roast through the Upstash REST API with SET NX + 1-year TTL", async () => {
    const kv = fakeUpstash();
    const store = getStore(env, kv.f)!;
    expect(store.kind).toBe("upstash");
    const rec = await record();
    const id = await saveRecord(rec, store);
    expect(id).toMatch(/^lena-bytes-/);
    expect(kv.calls[0]).toEqual(["SET", `roast:${id}`, expect.any(String), "EX", 31536000, "NX"]);
    expect(await loadRecord(id!, store)).toEqual(rec);
    expect(String(kv.calls[0][2]).length).toBeLessThan(6000); // compressed
  });

  it("retries on an id collision instead of overwriting", async () => {
    const kv = fakeUpstash({ failSets: 1 });
    const id = await saveRecord(await record(), getStore(env, kv.f));
    expect(id).not.toBeNull();
    expect(kv.calls.filter((c) => c[0] === "SET")).toHaveLength(2);
  });

  it("returns null (caller falls back to a signed link) when the store is down", async () => {
    const kv = fakeUpstash({ down: true });
    expect(await saveRecord(await record(), getStore(env, kv.f))).toBeNull();
    expect(await loadRecord("lena-bytes-abcdef", getStore(env, kv.f))).toBeNull();
  });

  it("has no store in production unless configured", () => {
    expect(getStore({ NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(getStore({ NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv)?.kind).toBe("memory");
    expect(getStore({ UPSTASH_REDIS_REST_URL: "u", UPSTASH_REDIS_REST_TOKEN: "t", NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)?.kind).toBe("upstash");
  });

  it("rejects malformed ids without touching the store", async () => {
    const kv = fakeUpstash();
    expect(await loadRecord("../../etc", getStore(env, kv.f))).toBeNull();
    expect(kv.calls).toHaveLength(0);
  });
});
