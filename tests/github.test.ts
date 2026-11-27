import { describe, expect, it } from "vitest";
import { parseGitHubProfile } from "@/lib/github/url";
import { collectFootprint, LIMITS } from "@/lib/github/collect";
import { GitHubError, readGitHubConfig } from "@/lib/github/client";
import { analyzeReadme } from "@/lib/github/readme";
import { fixtureFetch } from "../scripts/mock-github/fixtures.mjs";

const cfg = (calls: string[] = [], token = false) =>
  readGitHubConfig({ GITHUB_API_BASE_URL: "http://mock", ...(token ? { GITHUB_TOKEN: "t" } : {}) } as unknown as NodeJS.ProcessEnv, fixtureFetch(calls));


describe("parseGitHubProfile", () => {
  it.each([
    ["https://github.com/octocat", "octocat"],
    ["github.com/octocat", "octocat"],
    ["http://www.github.com/octocat/", "octocat"],
    ["https://github.com/octocat?tab=repositories", "octocat"],
    ["https://github.com/octocat/Hello-World", "octocat"],
    ["@octocat", "octocat"],
    ["octo-cat", "octo-cat"],
    ["  https://github.com/a  ", "a"],
  ])("accepts %s", (input, user) => expect(parseGitHubProfile(input)).toEqual({ ok: true, username: user }));

  it.each([
    "",
    "https://gitlab.com/octocat",
    "https://github.com/",
    "https://github.com/settings",
    "https://github.com/orgs/vercel",
    "https://evilgithub.com/octocat",
    "github.com.evil.io/octocat",
    "-octocat",
    "octo--cat",
    "a".repeat(40),
    "octo cat",
    "<script>",
    "javascript:alert(1)",
  ])("rejects %s", (input) => expect(parseGitHubProfile(input).ok).toBe(false));
});

describe("collectFootprint", () => {
  it("collects a rich profile within the request budget", async () => {
    const calls: string[] = [];
    const stages: string[] = [];
    const fp = await collectFootprint("lena-bytes", cfg(calls), (e) => stages.push(`${e.stage}:${e.status}`));
    expect(fp.profile.login).toBe("lena-bytes");
    expect(fp.repos.length).toBe(16);
    expect(fp.readmes.length).toBe(LIMITS.readmes);
    expect(fp.readmes.find((r) => r.repo === "todo-app-final-v2")?.template).toBe("Create React App");
    expect(fp.readmes.filter((r) => r.missing).length).toBeGreaterThan(0);
    expect(fp.commits.length).toBe(8);
    expect(fp.commits[0].id).toBe("c1");
    expect(fp.activity.eventCount).toBe(16);
    expect(fp.pinned).toBeNull(); // no token => no GraphQL
    expect(fp.languages[0].name).toBe("JavaScript");
    expect(calls.length).toBeLessThanOrEqual(10);
    expect(calls.some((c) => c.includes("per_page=100"))).toBe(true);
    expect(stages).toEqual(["profile:start", "profile:done", "repos:start", "repos:done", "readmes:start", "readmes:done", "activity:start", "activity:done"]);
    const ids = fp.facts.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["stale_repos", "readme_template", "lazy_commits", "top_repo", "fork_share"]));
    expect(fp.facts.find((f) => f.id === "lazy_commits")?.value).toBe("6 of 8 sampled");
  });

  it("handles a profile with no public repos", async () => {
    const calls: string[] = [];
    const fp = await collectFootprint("empty-octo", cfg(calls));
    expect(fp.repos).toEqual([]);
    expect(fp.readmes).toEqual([]);
    expect(calls.some((c) => c.includes("/repos?"))).toBe(false);
  });

  it.each([
    ["no-such-user", "not_found"],
    ["acme-org", "organization"],
    ["rate-limited", "rate_limited"],
    ["broken-api", "unavailable"],
  ])("maps %s to %s", async (user, code) => {
    const err = await collectFootprint(user, cfg()).catch((e) => e);
    expect(err).toBeInstanceOf(GitHubError);
    expect((err as GitHubError).code).toBe(code);
    if (code === "rate_limited") expect((err as GitHubError).resetAt).toBeGreaterThan(Date.now());
  });

  it("reports network failures", async () => {
    const c = readGitHubConfig({} as NodeJS.ProcessEnv, (async () => { throw new TypeError("fetch failed"); }) as typeof fetch);
    const err = await collectFootprint("lena-bytes", c).catch((e) => e);
    expect((err as GitHubError).code).toBe("network");
  });

  it("sends the token server-side only via Authorization header", async () => {
    let auth: string | null = null;
    const f = (async (_u: string, init: RequestInit) => {
      auth = new Headers(init.headers).get("authorization");
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;
    await collectFootprint("x", readGitHubConfig({ GITHUB_TOKEN: "secret" } as unknown as NodeJS.ProcessEnv, f)).catch(() => {});
    expect(auth).toBe("Bearer secret");
  });
});

describe("caching", () => {
  it("asks Next's fetch cache to store responses, tagged per user", async () => {
    const inits: RequestInit[] = [];
    const f = (async (_u: string, init: RequestInit) => {
      inits.push(init);
      return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
    }) as unknown as typeof fetch;
    await collectFootprint("Lena-Bytes", readGitHubConfig({} as NodeJS.ProcessEnv, f)).catch(() => {});
    expect(inits[0]).toMatchObject({ cache: "force-cache", next: { revalidate: 900, tags: ["github", "github:lena-bytes"] } });
  });
  it("can be disabled with GITHUB_CACHE_SECONDS=0", async () => {
    const inits: RequestInit[] = [];
    const f = (async (_u: string, init: RequestInit) => {
      inits.push(init);
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;
    await collectFootprint("x", readGitHubConfig({ GITHUB_CACHE_SECONDS: "0" } as unknown as NodeJS.ProcessEnv, f)).catch(() => {});
    expect(inits[0].cache).toBe("no-store");
  });
  it("dates the data from GitHub's Date header, so cached data reports its real age", async () => {
    const served = new Date(Date.now() - 7 * 60_000).toUTCString();
    const base = fixtureFetch();
    const f = (async (u: string, init: RequestInit) => {
      const res = await base(u, init);
      const h = new Headers(res.headers);
      h.set("date", served);
      return new Response(await res.text(), { status: res.status, headers: h });
    }) as unknown as typeof fetch;
    const stages: string[] = [];
    const fp = await collectFootprint("lena-bytes", readGitHubConfig({} as NodeJS.ProcessEnv, f), (e) => e.detail && stages.push(e.detail));
    expect(Date.parse(fp.dataAsOf)).toBe(Date.parse(served));
    expect(stages[0]).toMatch(/cached 7 min ago/);
  });
});

describe("analyzeReadme", () => {
  it("detects missing, template and structure", () => {
    expect(analyzeReadme("a", null).missing).toBe(true);
    const r = analyzeReadme("b", "# Title\n\n## Install\n\n```\nnpm i\n```\n\n## Usage\nRun it. ![x](y.png)");
    expect(r).toMatchObject({ missing: false, headings: 3, codeBlocks: 1, images: 1, hasInstall: true, hasUsage: true, template: null });
  });
});
