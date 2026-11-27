import type { CommitSample, Footprint, ReadmeInsight, RepoSummary, StageEvent } from "@/types/github";
import { ghGet, ghGraphQL, GitHubError, type GitHubConfig } from "./client";
import { commitsSchema, eventsSchema, graphqlSchema, reposSchema, userSchema } from "./schemas";
import { computeFacts, languageShares, summarizeActivity, toProfile, toRepo } from "./normalize";
import { analyzeReadme } from "./readme";

/**
 * Request budget per roast (worst case 11 calls):
 *   1 profile · 1 repo list (100 most recently pushed) · 1 public events
 *   ≤5 READMEs (top 3 by stars + 2 most recently pushed, non-fork)
 *   ≤2 commit lists (2 most recently pushed non-fork repos, 10 each)
 *   +1 GraphQL (pinned repos, contribution total) only when GITHUB_TOKEN is set
 */
export const LIMITS = { repos: 100, readmes: 5, commitRepos: 2, commitsPerRepo: 10, readmeBytes: 30_000 } as const;

type Emit = (e: StageEvent) => void;

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function pickReadmeRepos(own: RepoSummary[]): string[] {
  const byStars = [...own].filter((r) => r.sizeKb > 0).sort((a, b) => b.stars - a.stars || (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""));
  const byPush = [...own].filter((r) => r.sizeKb > 0).sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? ""));
  const picked: string[] = [];
  for (const r of [...byStars.slice(0, 3), ...byPush]) {
    if (picked.length >= LIMITS.readmes) break;
    if (!picked.includes(r.name)) picked.push(r.name);
  }
  return picked;
}

const PINNED_QUERY = `query($login: String!) {
  user(login: $login) {
    pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name } } }
    contributionsCollection { contributionCalendar { totalContributions } }
  }
}`;

export async function collectFootprint(username: string, cfg: GitHubConfig, emit: Emit = () => {}, now = Date.now()): Promise<Footprint> {
  const u = encodeURIComponent(username);

  // 1. Profile
  emit({ type: "stage", stage: "profile", status: "start" });
  const userRes = await ghGet(cfg, `/users/${u}`);
  if (userRes.status === 404) throw new GitHubError("not_found", `There's no GitHub user called @${username}.`);
  if (!userRes.data) throw new GitHubError("unavailable", `GitHub didn't return a profile for @${username} (${userRes.status}).`);
  const userParsed = userSchema.safeParse(userRes.data);
  if (!userParsed.success) throw new GitHubError("unavailable", "GitHub returned a profile we couldn't read.");
  if (userParsed.data.type === "Organization") {
    throw new GitHubError("organization", `@${userParsed.data.login} is an organization. RepoRiot roasts people, so paste a personal profile.`);
  }
  const profile = toProfile(userParsed.data);
  emit({ type: "stage", stage: "profile", status: "done", detail: `Found @${profile.login}${profile.name ? ` (${profile.name})` : ""}` });

  // 2. Repositories
  emit({ type: "stage", stage: "repos", status: "start" });
  let repos: RepoSummary[] = [];
  if (profile.publicRepos > 0) {
    const repoRes = await ghGet(cfg, `/users/${u}/repos?type=owner&sort=pushed&direction=desc&per_page=${LIMITS.repos}`);
    const parsed = reposSchema.safeParse(repoRes.data ?? []);
    repos = parsed.success ? parsed.data.map(toRepo) : [];
  }
  const own = repos.filter((r) => !r.isFork);
  emit({
    type: "stage",
    stage: "repos",
    status: "done",
    detail: repos.length
      ? `Listed ${plural(repos.length, "public repo")}${profile.publicRepos > repos.length ? ` of ${profile.publicRepos}` : ""}, ${own.length} not forks`
      : "No public repositories",
  });

  // 3. READMEs (+ pinned via GraphQL in parallel when a token exists)
  const readmeTargets = pickReadmeRepos(own);
  emit({ type: "stage", stage: "readmes", status: readmeTargets.length ? "start" : "skipped", detail: readmeTargets.length ? undefined : "No READMEs to read" });
  const graphqlP = ghGraphQL(cfg, PINNED_QUERY, { login: profile.login });
  const readmes: ReadmeInsight[] = await Promise.all(
    readmeTargets.map(async (name) => {
      const res = await ghGet(cfg, `/repos/${u}/${encodeURIComponent(name)}/readme`, { accept: "application/vnd.github.raw+json", raw: true, maxBytes: LIMITS.readmeBytes });
      return analyzeReadme(name, res.status === 200 ? res.text : null);
    }),
  );
  if (readmeTargets.length) {
    const missing = readmes.filter((r) => r.missing).length;
    emit({ type: "stage", stage: "readmes", status: "done", detail: `Read ${plural(readmes.length - missing, "README")}${missing ? `, ${missing} missing` : ""}` });
  }

  // 4. Activity: public events + recent commit messages
  emit({ type: "stage", stage: "activity", status: "start" });
  const eventsP = ghGet(cfg, `/users/${u}/events/public?per_page=100`).then((r) => {
    if (r.status !== 200) return null;
    const p = eventsSchema.safeParse(r.data);
    return p.success ? p.data : null;
  });
  const commitTargets = [...own].filter((r) => r.sizeKb > 0 && r.pushedAt).sort((a, b) => (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "")).slice(0, LIMITS.commitRepos);
  const commitLists = await Promise.all(
    commitTargets.map(async (r) => {
      const res = await ghGet(cfg, `/repos/${u}/${encodeURIComponent(r.name)}/commits?author=${u}&per_page=${LIMITS.commitsPerRepo}`);
      if (res.status !== 200) return []; // 409 = empty repo
      const p = commitsSchema.safeParse(res.data);
      return p.success ? p.data.map((c) => ({ repo: r.name, message: c.commit.message.split("\n")[0].slice(0, 120), date: c.commit.author?.date ?? null })) : [];
    }),
  );
  const commits: CommitSample[] = commitLists.flat().map((c, i) => ({ id: `c${i + 1}`, ...c }));
  const events = await eventsP;
  const gql = graphqlSchema.safeParse(await graphqlP);
  const gUser = gql.success ? gql.data.data?.user : null;
  const pinned = gUser ? gUser.pinnedItems.nodes.map((n) => n?.name).filter((n): n is string => !!n) : null;
  const contributions = gUser?.contributionsCollection?.contributionCalendar.totalContributions ?? null;
  const activity = summarizeActivity(events, contributions);
  emit({
    type: "stage",
    stage: "activity",
    status: "done",
    detail: [events ? plural(events.length, "public event") : "Events unavailable", commits.length ? plural(commits.length, "recent commit") : null].filter(Boolean).join(" and "),
  });

  const languages = languageShares(repos);
  return {
    profile,
    repos,
    readmes,
    commits,
    activity,
    pinned,
    languages,
    facts: computeFacts({ profile, repos, readmes, commits, activity, languages, pinned, now }),
    fetchedAt: new Date(now).toISOString(),
  };
}

/** Per-instance cache so repeat roasts of one profile don't spend API quota. */
const cache = new Map<string, { at: number; footprint: Footprint }>();
const TTL = 15 * 60_000;

export function cachedFootprint(username: string, now = Date.now()): Footprint | null {
  const hit = cache.get(username.toLowerCase());
  if (hit && now - hit.at < TTL) return hit.footprint;
  return null;
}
export function storeFootprint(fp: Footprint, now = Date.now()) {
  cache.set(fp.profile.login.toLowerCase(), { at: now, footprint: fp });
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
}
export function _clearFootprintCache() {
  cache.clear();
}
