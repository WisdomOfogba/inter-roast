/**
 * Thin server-only wrapper over the GitHub REST API. Never import from client
 * components: it reads GITHUB_TOKEN.
 */

export type GitHubErrorCode = "not_found" | "rate_limited" | "unavailable" | "network" | "organization";

export class GitHubError extends Error {
  constructor(
    public code: GitHubErrorCode,
    message: string,
    public resetAt?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export interface GitHubConfig {
  baseUrl: string;
  token: string | null;
  fetch: typeof fetch;
  timeoutMs: number;
  /** Seconds a successful GitHub response stays fresh in Next's fetch cache (0 = no caching). */
  cacheSeconds: number;
  /**
   * Optional persistent memo for results the fetch cache can't hold (e.g. a
   * README 404). Injected by the route with unstable_cache; absent in tests.
   */
  memo?: <T>(key: string[], tags: string[], fn: () => Promise<T>) => Promise<T>;
}

/** Cache tag for everything fetched about one GitHub user. */
export const githubTag = (username: string) => `github:${username.toLowerCase()}`;

export function readGitHubConfig(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): GitHubConfig {
  return {
    // Override only for tests / GitHub Enterprise. Defaults to the public API.
    baseUrl: (env.GITHUB_API_BASE_URL?.trim() || "https://api.github.com").replace(/\/+$/, ""),
    token: env.GITHUB_TOKEN?.trim() || null,
    fetch: fetchImpl,
    timeoutMs: 10_000,
    cacheSeconds: Number.isFinite(Number(env.GITHUB_CACHE_SECONDS)) && env.GITHUB_CACHE_SECONDS !== undefined ? Number(env.GITHUB_CACHE_SECONDS) : 900,
  };
}

export interface GitHubResponse<T = unknown> {
  status: number;
  data: T | null;
  text: string | null;
  headers: Headers;
}

function rateLimitError(res: Response): GitHubError | null {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const retryAfter = res.headers.get("retry-after");
  if ((res.status === 403 || res.status === 429) && (remaining === "0" || retryAfter || res.status === 429)) {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const resetAt = Number.isFinite(reset) && reset > 0 ? reset * 1000 : retryAfter ? Date.now() + Number(retryAfter) * 1000 : undefined;
    return new GitHubError("rate_limited", "GitHub's API rate limit was reached.", resetAt);
  }
  return null;
}

/**
 * Next.js fetch cache (Vercel Data Cache in production): shared across
 * instances, survives deploys, and only ever stores 200 responses, so errors
 * and rate-limit replies are never cached. Tagged per user for invalidation.
 */
function cacheInit(cfg: GitHubConfig, tag?: string): RequestInit {
  if (!cfg.cacheSeconds) return { cache: "no-store" };
  return { cache: "force-cache", next: { revalidate: cfg.cacheSeconds, tags: ["github", ...(tag ? [tag] : [])] } } as RequestInit;
}

/**
 * GET a GitHub API path. Returns the status for 404/409/451 (callers decide),
 * throws GitHubError for rate limits, network failures and 5xx.
 */
export async function ghGet<T = unknown>(
  cfg: GitHubConfig,
  path: string,
  opts: { accept?: string; raw?: boolean; maxBytes?: number; tag?: string } = {},
): Promise<GitHubResponse<T>> {
  const headers: Record<string, string> = {
    Accept: opts.accept ?? "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "RepoRiot",
  };
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;

  let res: Response;
  try {
    res = await cfg.fetch(`${cfg.baseUrl}${path}`, { headers, signal: AbortSignal.timeout(cfg.timeoutMs), ...cacheInit(cfg, opts.tag) });
  } catch {
    throw new GitHubError("network", "Couldn't reach GitHub. Check your connection and try again.");
  }

  const limited = rateLimitError(res);
  if (limited) throw limited;
  if (res.status >= 500) throw new GitHubError("unavailable", `GitHub returned an error (${res.status}). Try again in a minute.`);

  if (!res.ok) return { status: res.status, data: null, text: null, headers: res.headers };

  if (opts.raw) {
    let text = await res.text();
    if (opts.maxBytes && text.length > opts.maxBytes) text = text.slice(0, opts.maxBytes);
    return { status: res.status, data: null, text, headers: res.headers };
  }
  try {
    return { status: res.status, data: (await res.json()) as T, text: null, headers: res.headers };
  } catch {
    throw new GitHubError("unavailable", "GitHub sent a response we couldn't read.");
  }
}

/** Optional GraphQL call (only with a token). Failures are non-fatal. */
export async function ghGraphQL(cfg: GitHubConfig, query: string, variables: Record<string, unknown>, tag?: string): Promise<unknown | null> {
  if (!cfg.token) return null;
  try {
    const res = await cfg.fetch(`${cfg.baseUrl}/graphql`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json", "User-Agent": "RepoRiot" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
      ...cacheInit(cfg, tag),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
