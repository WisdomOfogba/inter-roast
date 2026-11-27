import type { ActivitySummary, CommitSample, Fact, LanguageShare, ProfileSummary, ReadmeInsight, RepoSummary } from "@/types/github";
import type { GitHubRepoRaw, GitHubUserRaw } from "./schemas";

const DAY = 86_400_000;

export function toProfile(u: GitHubUserRaw): ProfileSummary {
  return {
    login: u.login,
    id: u.id,
    name: u.name?.slice(0, 80) ?? null,
    bio: u.bio?.slice(0, 200) ?? null,
    followers: u.followers,
    following: u.following,
    publicRepos: u.public_repos,
    publicGists: u.public_gists,
    createdAt: u.created_at,
  };
}

export function toRepo(r: GitHubRepoRaw): RepoSummary {
  return {
    name: r.name,
    description: r.description?.slice(0, 200) ?? null,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    topics: r.topics.slice(0, 8),
    isFork: r.fork,
    archived: r.archived,
    hasHomepage: !!r.homepage?.trim(),
    hasLicense: !!r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION",
    sizeKb: r.size,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
  };
}

export function languageShares(repos: RepoSummary[]): LanguageShare[] {
  const counts = new Map<string, number>();
  for (const r of repos) if (!r.isFork && r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  return [...counts.entries()].map(([name, repos]) => ({ name, repos })).sort((a, b) => b.repos - a.repos || a.name.localeCompare(b.name));
}

export function summarizeActivity(
  events: { type: string | null; created_at: string }[] | null,
  contributionsLastYear: number | null,
): ActivitySummary {
  if (!events || events.length === 0) {
    return { available: !!events, eventCount: 0, byType: {}, firstEventAt: null, lastEventAt: null, activeDays: 0, contributionsLastYear };
  }
  const byType: Record<string, number> = {};
  const days = new Set<string>();
  for (const e of events) {
    const t = (e.type ?? "Other").replace(/Event$/, "");
    byType[t] = (byType[t] ?? 0) + 1;
    days.add(e.created_at.slice(0, 10));
  }
  const sorted = events.map((e) => e.created_at).sort();
  return {
    available: true,
    eventCount: events.length,
    byType,
    firstEventAt: sorted[0],
    lastEventAt: sorted[sorted.length - 1],
    activeDays: days.size,
    contributionsLastYear,
  };
}

const GENERIC_NAME = /^(test|testing|demo|practice|sample|example|untitled|new-?repo|my-?app|my-?project|project-?\d*|app-?\d*|hello-?world|first-?repo|repo-?\d*|todo(-?app|-?list)?|calculator|weather-?app|clone|learning|tutorial|playground|temp|tmp|sandbox)$/i;

export function isGenericName(name: string): boolean {
  return GENERIC_NAME.test(name) || /(^|[-_])(final|v\d|copy|new|old|backup)([-_]|$)/i.test(name);
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * Facts are the only numbers the roast may cite. Each has a stable id the AI
 * references, a value computed here (never by the model), and a definition.
 */
export function computeFacts(args: {
  profile: ProfileSummary;
  repos: RepoSummary[];
  readmes: ReadmeInsight[];
  commits: CommitSample[];
  activity: ActivitySummary;
  languages: LanguageShare[];
  pinned: string[] | null;
  now?: number;
}): Fact[] {
  const { profile, repos, readmes, commits, activity, languages, pinned } = args;
  const now = args.now ?? Date.now();
  const own = repos.filter((r) => !r.isFork);
  const facts: Fact[] = [];
  const add = (id: string, label: string, value: string, definition: string) => facts.push({ id, label, value, definition });

  const years = Math.max(0, (now - Date.parse(profile.createdAt)) / (365.25 * DAY));
  add("account_age", "Account age", years < 1 ? "under a year" : `${Math.floor(years)} ${Math.floor(years) === 1 ? "year" : "years"}`, "Time since the GitHub account was created.");
  add("public_repos", "Public repos", String(profile.publicRepos), "Public repositories on the profile, including forks.");
  add("repos_analyzed", "Repos analyzed", String(repos.length), "Public repos we listed: the most recently pushed, up to 100.");

  if (repos.length) {
    const forks = repos.length - own.length;
    add("fork_share", "Forks", `${forks} of ${repos.length} (${pct(forks, repos.length)}%)`, "Listed repos that are forks of someone else's project.");
  }
  if (own.length) {
    const stars = own.reduce((s, r) => s + r.stars, 0);
    add("total_stars", "Stars on own repos", String(stars), "Stars across listed non-fork repos.");
    const top = [...own].sort((a, b) => b.stars - a.stars)[0];
    add("top_repo", "Most-starred repo", `${top.name} (${plural(top.stars, "star")})`, "Listed non-fork repo with the most stars.");
    const zero = own.filter((r) => r.stars === 0).length;
    add("zero_star_repos", "Repos with no stars", `${zero} of ${own.length}`, "Listed non-fork repos with 0 stars.");
    const stale = own.filter((r) => !r.archived && r.pushedAt && now - Date.parse(r.pushedAt) > 365 * DAY).length;
    add("stale_repos", "Untouched for a year+", `${stale} of ${own.length}`, "Non-archived, non-fork repos with no push in the last 365 days.");
    const noDesc = own.filter((r) => !r.description).length;
    add("no_description", "No description", `${noDesc} of ${own.length}`, "Non-fork repos with an empty description.");
    const generic = own.filter((r) => isGenericName(r.name)).length;
    add("generic_names", "Generic names", `${generic} of ${own.length}`, "Non-fork repos named like test, demo, todo-app, project-final-v2.");
    const topics = own.filter((r) => r.topics.length).length;
    add("with_topics", "Repos with topics", `${topics} of ${own.length}`, "Non-fork repos that have at least one topic tag.");
    const licensed = own.filter((r) => r.hasLicense).length;
    add("with_license", "Repos with a license", `${licensed} of ${own.length}`, "Non-fork repos with a detected open-source license.");
    const lastPush = own.map((r) => r.pushedAt).filter(Boolean).sort().at(-1);
    if (lastPush) {
      const d = Math.floor((now - Date.parse(lastPush)) / DAY);
      add("last_push", "Last push", d === 0 ? "today" : `${plural(d, "day")} ago`, "Most recent push to any listed non-fork repo.");
    }
  }
  if (languages.length) {
    const total = languages.reduce((s, l) => s + l.repos, 0);
    add("languages", "Primary languages", String(languages.length), "Distinct primary languages across non-fork repos (GitHub's per-repo language).");
    add("top_language", "Top language", `${languages[0].name} (${pct(languages[0].repos, total)}% of repos)`, "Most common primary language among non-fork repos.");
  }
  const checked = readmes.length;
  if (checked) {
    const missing = readmes.filter((r) => r.missing).length;
    add("readme_missing", "READMEs missing", `${missing} of ${checked} checked`, "Of the repos whose README we fetched, how many have none.");
    const templ = readmes.filter((r) => r.template).length;
    if (templ) add("readme_template", "Starter READMEs", `${templ} of ${checked} checked`, "READMEs that are still a framework's default starter text.");
    const present = readmes.filter((r) => !r.missing);
    if (present.length) {
      const median = [...present].map((r) => r.words).sort((a, b) => a - b)[Math.floor(present.length / 2)];
      add("readme_words", "Median README length", plural(median, "word"), "Median word count of the READMEs that exist, code blocks excluded.");
    }
  }
  if (activity.available) {
    add("recent_events", "Public events", `${activity.eventCount} on ${plural(activity.activeDays, "day")}`, "Public events GitHub returned (last 90 days, max 100).");
  }
  if (activity.contributionsLastYear !== null) {
    add("contributions", "Contributions (year)", String(activity.contributionsLastYear), "Total on the public contribution graph for the last year.");
  }
  if (commits.length) {
    const lazy = commits.filter((c) => /^(update|updates|fix|fixes|fixed|wip|changes|commit|stuff|asdf|test|minor|edit|done|final|\.|-|ok|initial commit|first commit|add files via upload|update readme\.md)\s*\.?$/i.test(c.message.trim())).length;
    add("lazy_commits", "Low-effort commit messages", `${lazy} of ${commits.length} sampled`, "Recent commit messages that are just 'update', 'fix', 'wip' and similar.");
  }
  if (pinned !== null) add("pinned_count", "Pinned repos", String(pinned.length), "Repos pinned on the profile page.");
  add("followers", "Followers", String(profile.followers), "People following this account.");
  return facts;
}
