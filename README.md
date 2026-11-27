# RepoRiot

**Your code has receipts.**

Paste a public GitHub profile URL. RepoRiot reads the public repositories, READMEs, recent commit messages and activity through the official GitHub REST API, then writes a roast styled as a code review of the profile. Every joke cites its evidence: the actual repos, READMEs, commits and numbers behind it.

- Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4, Zod
- GitHub REST API (server-side only, optional token)
- Google Gemini via `@google/genai` (optional, free tier) with structured JSON output and evidence grounding
- A rules engine that writes a labelled, fact-based roast when Gemini isn't configured or fails
- Share images (1200×630 and 1080×1350) exported client-side with html-to-image, plus OG link previews
- No database, no accounts. Deploys to Vercel's free Hobby plan.

## How a roast is made

```
paste URL ──► POST /api/roast (NDJSON stream)
               ├─ profile   GET /users/{user}
               ├─ repos     GET /users/{user}/repos?type=owner&sort=pushed&per_page=100
               ├─ readmes   GET /repos/{user}/{repo}/readme        (≤5: top 3 by stars + most recent)
               ├─ activity  GET /users/{user}/events/public?per_page=100
               │            GET /repos/{user}/{repo}/commits?author={user}&per_page=10   (≤2 repos)
               │            POST /graphql  pinned repos + contribution total (only with GITHUB_TOKEN)
               └─ roast     Gemini → Zod validation → evidence grounding  (or rules engine)
            ──► signed share link /r/{token}
```

The loading log in the UI is driven by those real stage events: a stage appears only when the server actually starts it.

- **Budget:** at most 11 GitHub requests for a first roast, 0 for a repeat (see Caching).
- **Facts, not vibes:** `src/lib/github/normalize.ts` computes every number the roast may cite (stale repos, missing READMEs, starter-template READMEs, low-effort commit messages and so on). Each fact has an id and a plain-language definition. The model cites fact ids; the UI shows our values, never the model's.
- **Grounding:** each review comment must cite evidence (`repo`, `readme`, `fact` or `commit`). Evidence that doesn't match retrieved data is dropped, then comments without evidence are dropped. Fewer than 2 grounded comments means the output is rejected.
- **Honest fallbacks:** if GitHub fails (404, organization, rate limit, network, 5xx), the user gets a specific error and a retry, never a fake roast. If Gemini fails (quota, outage, malformed or blocked output), the rules engine writes a roast from the same facts, and the result page says so and why.
- **What we don't claim:** private repos and contributions are invisible to us, and the prompt forbids guessing about them. It also forbids judging intelligence, employability or character, and treating stars or commit counts as quality.

## Caching and fresh data

No database is needed. Next.js caches give persistence shared across serverless instances (on Vercel, the Data Cache):

| What | How | Lifetime | Invalidated by |
| --- | --- | --- | --- |
| GitHub responses (profile, repos, events, commits, READMEs, GraphQL) | `fetch` with `cache: "force-cache"`, tags `github` and `github:{login}` | 15 min (`GITHUB_CACHE_SECONDS`), then stale-while-revalidate | Refresh, or time |
| Missing-README lookups (404s, which the fetch cache never stores) | `unstable_cache`, keyed by repo + `pushed_at` | 1 hour, or as soon as the repo is pushed | A push, refresh or time |
| Gemini roasts | `unstable_cache`, keyed by login + heat + data version | 6 hours | New GitHub data, refresh or time |

- **Never cached:** errors (404 user, rate limits, 5xx) and rules-engine fallbacks. A quota fallback never gets stuck, and a new account works immediately.
- **Repeat roasts:** a repeat roast of the same profile makes **0 GitHub requests**. Usernames are lowercased, so `Octocat` and `octocat` share a cache entry. With the same heat and unchanged data, Gemini isn't called again either, and the loading log says it reused the earlier roast.
- **Updated profiles:** the result page shows *"GitHub data as of …"* from GitHub's own `Date` header, which cached responses keep, so the age is real. **"Fetch latest data and re-roast"** sends `refresh: true`, which runs `revalidateTag("github:{login}", { expire: 0 })` and refetches. It's limited to once per profile per minute so it can't drain the quota. Old share links stay snapshots of the roast they were made from.
- **Deploys:** fetch-cache and `unstable_cache` entries persist across deploys on Vercel (per the Next 16 docs). Bump the `roast:v1` / `readme:v1` key prefix if their format changes.

## Short share links

With a store configured, roasts are saved under readable ids and links look like `https://your-site/r/octocat-k7q2xm`. Stored roasts never change, so page views go through a persistent cache and cost about one Redis read per link, not one per view. Entries expire after a year.

1. In Vercel, open **Storage** (or the **Marketplace**), add **Upstash for Redis**, and connect it to the project. The free tier is 256 MB and 500K commands a month, with no card required.
2. The integration adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` also work if you create the database on upstash.com, and so does a plain `REDIS_URL` / `KV_URL` (any Redis provider, for example Vercel's "Redis" by Redis Inc.).
3. Redeploy.
4. Open `/api/health?check=1` on your site. It reports whether links will be short and runs a live write and read against the store. It shows only yes/no flags and variable names, never values.

Without a store, or if a write fails, RepoRiot falls back to a long self-contained signed link, so roasting never breaks. Existing long links keep working after you add the store.

## Usage stats

With the share-link store connected, each completed roast also updates a few counters: total roasts, roasts per day, unique profiles (HyperLogLog, about ±1%), Gemini versus rules-engine roasts, and the most-roasted profiles. That's one request (about 8 Redis commands) per roast. Failed lookups aren't counted, and nothing about the person who ran a roast is stored.

To view them, set `STATS_KEY` (any random string of 12+ characters, e.g. `openssl rand -hex 16`), redeploy, and open `/api/stats?key=YOUR_KEY`. Without the right key the URL returns 404. Counting starts when this feature is deployed: earlier roasts aren't included.

## Local development

Requires Node 20.9+.

```bash
npm install
cp .env.example .env.local   # add GITHUB_TOKEN at least
npm run dev                  # http://localhost:3000
```

### Offline, with the mock GitHub API

```bash
npm run mock:github                                  # http://localhost:4010
GITHUB_API_BASE_URL=http://localhost:4010 npm run dev
```

`GET http://localhost:4010/__stats` returns how many API requests the mock served, which is handy for checking caching. Fictional users: `lena-bytes` (rich profile), `empty-octo` (no repos), `acme-org` (organization), `rate-limited` (403 with `x-ratelimit-remaining: 0`), `broken-api` (502). Anything else returns 404.

| Script | |
| --- | --- |
| `npm test` | Vitest: URL parsing, collection and error mapping against fixtures, README analysis, grounding, Gemini failure modes (mocked), rules engine, share tokens, rate limiter |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types + `tsc --noEmit` |
| `npm run build` | Production build |

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `GITHUB_TOKEN` | Strongly recommended | Unauthenticated GitHub allows 60 requests/hour **per server IP** (about 5 roasts), shared across Vercel's IPs. With a token: 5,000/hour. Use a fine-grained token with no extra permissions (public read is implicit). It also enables pinned repos and the contribution total. Server-only. |
| `ROAST_SIGNING_SECRET` | Yes in production, unless `GEMINI_API_KEY` is set | `openssl rand -hex 32`. Signs share links so nobody can forge roasts on your domain. |
| `GEMINI_API_KEY` | No | Enables AI roasts. Free key at https://aistudio.google.com/apikey. Server-only. |
| `GEMINI_MODEL` | No | Default `gemini-3.8-flash` (free tier, verified Nov 2026) |
| `GEMINI_QUOTA_FALLBACK_MODEL` | No | Default `gemini-3.5-flash-lite`, tried once after a 429. `none` disables it. |
| `GEMINI_THINKING_LEVEL` | No | `minimal` / `low` (default) / `medium` / `high` / `off` |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical URL printed on share images. Defaults to Vercel's production URL. |
| `ROAST_RATE_LIMIT_PER_MINUTE` | No | Per-IP roasts per minute per instance (default 4) |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Recommended | Upstash Redis for short share links (see above). Also accepts `UPSTASH_REDIS_REST_URL` / `_TOKEN`. In development an in-memory store is used automatically. |
| `STATS_KEY` | No | Enables the private `/api/stats?key=…` usage page (12+ characters) |
| `GITHUB_CACHE_SECONDS` | No | How long GitHub responses stay fresh (default 900; `0` disables caching) |
| `GITHUB_API_BASE_URL` | No | For tests and offline dev. Defaults to `https://api.github.com`. |

## Deploy to Vercel

1. Import the repo in Vercel (Next.js preset, default settings).
2. Under **Settings → Environment Variables**, add `GITHUB_TOKEN`, `ROAST_SIGNING_SECRET` and optionally `GEMINI_API_KEY` and `NEXT_PUBLIC_SITE_URL`, for Production and Preview.
3. Redeploy. Roast your own profile, download an image, and paste the link into a chat to check the preview.

## Limits and known gaps

- GitHub limits: see `GITHUB_TOKEN` above. When the limit is hit, users see when it resets.
- Repos are sampled: the 100 most recently pushed. A profile's most-starred repo older than that window can be missed.
- Pinned repos and contribution totals need a token (GraphQL). Without one, that category is skipped rather than guessed.
- GitHub's Events API returns at most 300 events from the last 90 days, and PushEvent payloads no longer include commit lists, so commit messages come from the commits endpoint for the two most recently pushed repos.
- The per-IP rate limiter and the refresh throttle are in memory, per serverless instance. The data caches are shared.
- Gemini free-tier quotas aren't published per model and are small. When exhausted, roasts fall back to the rules engine (labelled).
- Edited or forged share links show the "doesn't check out" page with HTTP 200 (the page streams under Partial Prerendering) and are `noindex`.

Not affiliated with GitHub, Inc. or Google. Comedy about public repos, not a judgement of anyone's skill.
