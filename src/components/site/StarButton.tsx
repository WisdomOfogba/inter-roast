import { cacheLife } from "next/cache";
import { Star } from "lucide-react";
import { GitHubIcon } from "@/components/brand/GitHubIcon";
import { SOURCE_REPO, SOURCE_URL } from "@/lib/site";
import { compact } from "@/components/review/format";

/** Real star count, cached for an hour (~24 GitHub calls a day). null if GitHub can't be reached. */
async function getStars(): Promise<number | null> {
  "use cache";
  cacheLife("hours");
  try {
    const token = process.env.GITHUB_TOKEN?.trim();
    const base = (process.env.GITHUB_API_BASE_URL?.trim() || "https://api.github.com").replace(/\/+$/, "");
    const res = await fetch(`${base}/repos/${SOURCE_REPO}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "RepoRiot", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: unknown };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

export async function StarButton() {
  const stars = await getStars();
  return (
    <a
      href={SOURCE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Star RepoRiot on GitHub${stars !== null ? ` (${stars} stars)` : ""}`}
      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line-strong px-2.5 text-[14px] font-medium text-fg transition-colors hover:bg-panel-2 sm:px-3"
    >
      <GitHubIcon className="size-4" />
      <span className="hidden sm:inline">Star</span>
      <Star className="size-3.5 text-amber sm:hidden" aria-hidden />
      {stars !== null && (
        <span className="border-l border-line-strong pl-2 font-mono text-[13px] text-muted tabular-nums">{compact(stars)}</span>
      )}
    </a>
  );
}
