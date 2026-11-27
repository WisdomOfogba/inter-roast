import { unstable_cache } from "next/cache";
import type { Footprint } from "@/types/github";
import type { Intensity } from "@/types/roast";
import { githubTag } from "@/lib/github/client";
import type { RoastOutcome } from "./index";

/**
 * Persist Gemini roasts (free-tier quota is precious) keyed by profile, heat
 * and the GitHub data version. unstable_cache is the Next 16 API for non-fetch
 * data that must persist across instances and deploys. Only real Gemini results
 * are cached: a rules-engine fallback (e.g. quota) is never pinned in place.
 */
class NotCacheable extends Error {
  constructor(public outcome: RoastOutcome) {
    super("not cacheable");
  }
}

export interface CachedRoast {
  outcome: RoastOutcome & { generatedAt: number };
  reused: boolean;
}

export async function getRoastCached(fp: Footprint, intensity: Intensity, compute: () => Promise<RoastOutcome>): Promise<CachedRoast> {
  const login = fp.profile.login.toLowerCase();
  let ran = false;
  const cached = unstable_cache(
    async () => {
      ran = true;
      const outcome = await compute();
      const stamped = { ...outcome, generatedAt: Date.now() };
      if (outcome.source !== "gemini") throw new NotCacheable(stamped);
      return stamped;
    },
    ["roast:v1", login, intensity, fp.dataAsOf],
    { revalidate: 6 * 60 * 60, tags: [githubTag(login)] },
  );
  try {
    const outcome = await cached();
    return { outcome, reused: !ran };
  } catch (e) {
    if (e instanceof NotCacheable) return { outcome: e.outcome as CachedRoast["outcome"], reused: false };
    throw e;
  }
}
