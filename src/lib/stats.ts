import { timingSafeEqual } from "node:crypto";
import type { Intensity, RoastSource } from "@/types/roast";
import { getStore, type RoastStore } from "@/lib/share/store";

/**
 * Usage counters in the same Redis as share links. Per roast: one round trip,
 * 7 commands. Unique profiles use HyperLogLog (fixed ~12 KB, ~0.8% error).
 * Stores public GitHub logins only: nothing about who ran the roast.
 */
const DAY_TTL = 400 * 24 * 60 * 60;
const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

export async function recordRoast(
  e: { login: string; source: RoastSource; intensity: Intensity },
  store: RoastStore | null = getStore(),
  now = Date.now(),
): Promise<void> {
  if (!store) return;
  const login = e.login.toLowerCase();
  const d = day(now);
  try {
    await store.pipeline([
      ["INCR", "stats:roasts"],
      ["INCR", `stats:roasts:${d}`],
      ["EXPIRE", `stats:roasts:${d}`, DAY_TTL],
      ["PFADD", "stats:profiles", login],
      ["PFADD", `stats:profiles:${d}`, login],
      ["EXPIRE", `stats:profiles:${d}`, DAY_TTL],
      ["ZINCRBY", "stats:top", 1, login],
      ["INCR", `stats:source:${e.source}`],
    ]);
  } catch (err) {
    // Stats must never break a roast.
    console.warn("[stats] not recorded:", err instanceof Error ? err.message.slice(0, 120) : "unknown");
  }
}

export interface Stats {
  totals: { roasts: number; uniqueProfiles: number; byGemini: number; byRulesEngine: number };
  last14Days: { date: string; roasts: number; uniqueProfiles: number }[];
  topProfiles: { login: string; roasts: number }[];
  note: string;
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v) || 0);

export async function readStats(store: RoastStore | null = getStore(), now = Date.now()): Promise<Stats | null> {
  if (!store) return null;
  const days = Array.from({ length: 14 }, (_, i) => day(now - i * 86_400_000));
  const res = await store.pipeline([
    ["GET", "stats:roasts"],
    ["PFCOUNT", "stats:profiles"],
    ["GET", "stats:source:gemini"],
    ["GET", "stats:source:engine"],
    ["ZREVRANGE", "stats:top", 0, 9, "WITHSCORES"],
    ...days.flatMap((d) => [
      ["GET", `stats:roasts:${d}`],
      ["PFCOUNT", `stats:profiles:${d}`],
    ]),
  ]);
  // Flat ["a","2",...] (Upstash REST, RESP2) or pairs [["a",2],...] (RESP3 over TCP).
  const top = ((Array.isArray(res[4]) ? res[4] : []) as unknown[]).flatMap((x) => (Array.isArray(x) ? x : [x]));
  return {
    totals: { roasts: num(res[0]), uniqueProfiles: num(res[1]), byGemini: num(res[2]), byRulesEngine: num(res[3]) },
    last14Days: days.map((date, i) => ({ date, roasts: num(res[5 + i * 2]), uniqueProfiles: num(res[6 + i * 2]) })),
    topProfiles: Array.from({ length: top.length / 2 }, (_, i) => ({ login: String(top[i * 2]), roasts: num(top[i * 2 + 1]) })),
    note: "Counted since stats were added. Each completed roast counts once (repeats included); unique profiles are approximate (±1%). Times in UTC.",
  };
}

/** Constant-time check of the ?key= against STATS_KEY. No key configured = stats disabled. */
export function statsKeyOk(given: string | null, env: NodeJS.ProcessEnv = process.env): boolean {
  const expected = env.STATS_KEY?.trim();
  if (!expected || expected.length < 12 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
