import { unstable_cache } from "next/cache";
import type { RoastRecord } from "@/types/roast";
import { decodeRecord, getSigningSecret } from "./token";
import { loadRecord, SHORT_ID } from "./store";

/**
 * Stored roasts never change, so cache found records persistently: a viral
 * link costs roughly one Redis read instead of one per view. Misses aren't cached.
 */
const loadCached = unstable_cache(
  async (id: string) => {
    const r = await loadRecord(id);
    if (!r) throw new Error("miss");
    return r;
  },
  ["share:v1"],
  { revalidate: 30 * 24 * 60 * 60 },
);

/** /r/{param}: a short id (stored) or a legacy signed token (contains a "."). */
export async function resolveRecord(param: string): Promise<RoastRecord | null> {
  const value = decodeURIComponent(param);
  if (value.includes(".")) return decodeRecord(value, getSigningSecret());
  if (!SHORT_ID.test(value)) return null;
  try {
    return await loadCached(value);
  } catch {
    return null;
  }
}
