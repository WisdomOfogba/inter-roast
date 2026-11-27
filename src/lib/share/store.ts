import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { RoastRecord } from "@/types/roast";
import { recordSchema } from "./token";

/**
 * Short share links: /r/{login}-{6 chars}. The roast is stored in Upstash Redis
 * (REST API, free tier: 256 MB / 500K commands a month) when configured.
 * Without a store, callers fall back to the long signed token links.
 *
 * Env (either pair works; Vercel's Upstash integration sets the KV_* names):
 *   KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 */

export const SHORT_ID = /^[a-z0-9](?:[a-z0-9-]{0,38})-[a-z0-9]{6}$/;
const TTL_SECONDS = 365 * 24 * 60 * 60;
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no l/o/0/1: easy to read aloud

export interface RoastStore {
  kind: "upstash" | "memory";
  set(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
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
  };
}

const memory = (): RoastStore => {
  const g = globalThis as unknown as { __reporiotStore?: Map<string, string> };
  g.__reporiotStore ??= new Map();
  const m = g.__reporiotStore;
  return { kind: "memory", set: async (k, v) => (m.has(k) ? false : (m.set(k, v), true)), get: async (k) => m.get(k) ?? null };
};

/** Upstash if configured; an in-memory store in development; otherwise none. */
export function getStore(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): RoastStore | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return upstash(url, token, fetchImpl);
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
