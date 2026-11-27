import type { Footprint } from "@/types/github";
import type { Intensity, RoastRecord } from "@/types/roast";
import type { RoastOutcome } from "./index";

/**
 * Keep the share link small: only the public data the result page shows
 * (cited repos plus a few top/recent ones, cited READMEs and commits).
 */
export function buildRecord(fp: Footprint, outcome: RoastOutcome, intensity: Intensity, caseId: string, now = Date.now()): RoastRecord {
  const cited = { repo: new Set<string>(), readme: new Set<string>(), commit: new Set<string>() };
  for (const c of outcome.result.comments) {
    for (const e of c.evidence) {
      if (e.kind === "repo") cited.repo.add(e.ref);
      if (e.kind === "readme") cited.readme.add(e.ref);
      if (e.kind === "commit") cited.commit.add(e.ref);
    }
  }
  const own = fp.repos.filter((r) => !r.isFork);
  const keep = new Set<string>([...cited.repo, ...cited.readme]);
  for (const r of [...own].sort((a, b) => b.stars - a.stars).slice(0, 4)) keep.add(r.name);
  for (const r of own.slice(0, 4)) keep.add(r.name);

  return {
    v: 2,
    caseId,
    intensity,
    profile: fp.profile,
    result: outcome.result,
    facts: fp.facts,
    repos: fp.repos.filter((r) => keep.has(r.name)).slice(0, 16),
    readmes: fp.readmes.filter((r) => cited.readme.has(r.repo)).map((r) => ({ ...r, excerpt: r.excerpt.slice(0, 160) })),
    commits: fp.commits.filter((c) => cited.commit.has(c.id)),
    languages: fp.languages.slice(0, 8),
    pinned: fp.pinned,
    dataAsOf: fp.dataAsOf,
    source: outcome.source,
    ...(outcome.model ? { model: outcome.model } : {}),
    ...(outcome.fallbackReason ? { fallbackReason: outcome.fallbackReason } : {}),
    createdAt: now,
  };
}
