import { deflateRawSync, inflateRawSync } from "node:zlib";
import { createClient } from "redis";
import type { RoastRecord } from "@/types/roast";
import { recordSchema } from "./token";

/**
 * Short share links: /r/{login}-{6 chars}. The roast is stored in Upstash Redis
 * (REST API, free tier: 256 MB / 500K commands a month) when configured.
 * Without a store, callers fall back to the long signed token links.
 *
 * Env, checked in this order:
 *   KV_REST_API_URL + KV_REST_API_TOKEN        (Vercel's Upstash integration)
 *   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN  (Upstash console)
 *   REDIS_URL / KV_URL                          (any Redis, e.g. Vercel's "Redis" by Redis Inc.)
 */

export const SHORT_ID = /^[a-z0-9](?:[a-z0-9-]{0,38})-[a-z0-9]{6}$/;
const TTL_SECONDS = 365 * 24 * 60 * 60;
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no l/o/0/1: easy to read aloud

export interface RoastStore {
  kind: "upstash" | "redis" | "memory";
  set(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  /** Run raw Redis commands in one round trip (used for stats). */
  pipeline(cmds: (string | number)[][]): Promise<unknown[]>;
}

function upstash(url: string, token: string, fetchImpl: typeof fetch): RoastStore {
  const call = async (cmd: (string | number)[]) => {
    const res = await fetchImpl(url.replace(/\/+$/, ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json().catch(() => null)) as { result?: unknown; error?: string } | null;
    if (!res.ok || !data || data.error) throw new Error(`Upstash ${res.status}: ${data?.error ?? "bad response"}`);
    return data.result;
  };
  return {
    kind: "upstash",
    // NX: never overwrite an existing roast, even on an id collision.
    set: async (k, v, ttl) => (await call(["SET", k, v, "EX", ttl, "NX"])) === "OK",
    get: async (k) => {
      const r = await call(["GET", k]);
      return typeof r === "string" ? r : null;
    },
    pipeline: async (cmds) => {
      const res = await fetchImpl(`${url.replace(/\/+$/, "")}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(cmds),
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const data = (await res.json().catch(() => null)) as { result?: unknown; error?: string }[] | null;
      if (!res.ok || !Array.isArray(data)) throw new Error(`Upstash pipeline ${res.status}`);
      return data.map((d) => (d.error ? null : d.result));
    },
  };
}

/** The three commands we use; avoids leaking node-redis's generic client types. */
interface MiniRedis {
  connect(): Promise<unknown>;
  set(k: string, v: string, o: { EX: number; NX: true }): Promise<string | null>;
  get(k: string): Promise<string | null>;
  sendCommand(args: string[]): Promise<unknown>;
}

/** Plain Redis over TCP. One lazily-connected client per server instance. */
function redisUrl(url: string): RoastStore {
  const g = globalThis as unknown as { __reporiotRedis?: { url: string; client: MiniRedis; ready: Promise<unknown> } };
  const handle = () => {
    let h = g.__reporiotRedis;
    if (!h || h.url !== url) {
      const c = createClient({ url, socket: { connectTimeout: 5000, reconnectStrategy: false } });
      c.on("error", () => {}); // surfaced through the failing command instead
      const client = c as unknown as MiniRedis;
      h = { url, client, ready: client.connect() };
      g.__reporiotRedis = h;
    }
    return h;
  };
  const run = async <T,>(fn: (c: MiniRedis) => Promise<T>): Promise<T> => {
    const h = handle();
    try {
      await h.ready;
      return await fn(h.client);
    } catch (e) {
      g.__reporiotRedis = undefined; // reconnect next time
      throw e;
    }
  };
  return {
    kind: "redis",
    set: async (k, v, ttl) => (await run((c) => c.set(k, v, { EX: ttl, NX: true }))) === "OK",
    get: async (k) => run((c) => c.get(k)),
    // node-redis auto-pipelines commands issued in the same tick.
    pipeline: async (cmds) => run((c) => Promise.all(cmds.map((cmd) => c.sendCommand(cmd.map(String))))),
  };
}

const memory = (): RoastStore => {
  const g = globalThis as unknown as { __reporiotStore?: Map<string, string>; __reporiotSets?: Map<string, Map<string, number>> };
  g.__reporiotStore ??= new Map();
  g.__reporiotSets ??= new Map();
  const m = g.__reporiotStore;
  const sets = g.__reporiotSets;
  const set = (k: string) => (sets.get(k) ?? sets.set(k, new Map()).get(k))!;
  // Just enough Redis for development and tests.
  const exec = (c: (string | number)[]): unknown => {
    const [op, key, ...a] = c.map(String);
    switch (op.toUpperCase()) {
      case "INCR": { const n = Number(m.get(key) ?? 0) + 1; m.set(key, String(n)); return n; }
      case "EXPIRE": return 1;
      case "GET": return m.get(key) ?? null;
      case "PFADD": { const st = set(key); const before = st.size; a.forEach((x) => st.set(x, 1)); return st.size > before ? 1 : 0; }
      case "PFCOUNT": return set(key).size;
      case "ZINCRBY": { const st = set(key); st.set(a[1], (st.get(a[1]) ?? 0) + Number(a[0])); return st.get(a[1]); }
      case "ZREVRANGE": return [...set(key).entries()].sort((x, y) => y[1] - x[1]).slice(Number(a[0]), Number(a[1]) + 1).flatMap(([k, v]) => [k, String(v)]);
      default: throw new Error(`memory store: unsupported ${op}`);
    }
  };
  return {
    kind: "memory",
    set: async (k, v) => (m.has(k) ? false : (m.set(k, v), true)),
    get: async (k) => m.get(k) ?? null,
    pipeline: async (cmds) => cmds.map(exec),
  };
};

/** Upstash if configured; an in-memory store in development; otherwise none. */
export function getStore(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): RoastStore | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return upstash(url, token, fetchImpl);
  const tcp = env.REDIS_URL || env.KV_URL;
  if (tcp && /^rediss?:\/\//.test(tcp)) return redisUrl(tcp);
  if (env.NODE_ENV !== "production" || env.ROAST_MEMORY_STORE === "1") return memory();
  return null;
}

export function newShortId(login: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `${login.toLowerCase()}-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

const pack = (r: RoastRecord) => deflateRawSync(Buffer.from(JSON.stringify(r), "utf8"), { level: 9 }).toString("base64");
function unpack(s: string): RoastRecord | null {
  try {
    const parsed = recordSchema.safeParse(JSON.parse(inflateRawSync(Buffer.from(s, "base64"), { maxOutputLength: 64_000 }).toString("utf8")));
    return parsed.success ? (parsed.data as unknown as RoastRecord) : null;
  } catch {
    return null;
  }
}

/** Store a roast and return its short id, or null if no store is available or the write failed. */
export async function saveRecord(record: RoastRecord, store: RoastStore | null = getStore()): Promise<string | null> {
  if (!store) return null;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const id = newShortId(record.profile.login);
      if (await store.set(`roast:${id}`, pack(record), TTL_SECONDS)) return id;
    }
  } catch (e) {
    console.error("[share] could not store roast:", e instanceof Error ? e.message : "unknown");
  }
  return null;
}

export async function loadRecord(id: string, store: RoastStore | null = getStore()): Promise<RoastRecord | null> {
  if (!store || !SHORT_ID.test(id)) return null;
  try {
    const raw = await store.get(`roast:${id}`);
    return raw ? unpack(raw) : null;
  } catch (e) {
    console.error("[share] could not read roast:", e instanceof Error ? e.message : "unknown");
    return null;
  }
}

/** Which store env vars are present (names only, never values). */
export function storeEnvPresence(env: NodeJS.ProcessEnv = process.env) {
  const names = ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "REDIS_URL", "KV_URL"] as const;
  return Object.fromEntries(names.map((n) => [n, !!env[n]?.trim()])) as Record<(typeof names)[number], boolean>;
}

/** Live write + read of a throwaway key, for the health check. */
export async function checkStore(store: RoastStore | null = getStore()): Promise<{ ok: boolean; error?: string }> {
  if (!store) return { ok: false, error: "no store configured" };
  try {
    const key = `health:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    if (!(await store.set(key, "ok", 60))) return { ok: false, error: "write was refused" };
    return (await store.get(key)) === "ok" ? { ok: true } : { ok: false, error: "read did not return the written value" };
  } catch (e) {
    // Error messages from Upstash/redis don't include credentials; strip URLs just in case.
    const msg = e instanceof Error ? e.message : "unknown error";
    return { ok: false, error: msg.replace(/\w+:\/\/\S+/g, "[url]").slice(0, 200) };
  }
}
