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

- **Budget:** at most 11 GitHub requests per roast. Footprints are cached in memory for 15 minutes per instance.
- **Facts, not vibes:** `src/lib/github/normalize.ts` computes every number the roast may cite (stale repos, missing READMEs, starter-template READMEs, low-effort commit messages and so on). Each fact has an id and a plain-language definition. The model cites fact ids; the UI shows our values, never the model's.
- **Grounding:** each review comment must cite evidence (`repo`, `readme`, `fact` or `commit`). Evidence that doesn't match retrieved data is dropped, then comments without evidence are dropped. Fewer than 2 grounded comments means the output is rejected.
- **Honest fallbacks:** if GitHub fails (404, organization, rate limit, network, 5xx), the user gets a specific error and a retry, never a fake roast. If Gemini fails (quota, outage, malformed or blocked output), the rules engine writes a roast from the same facts, and the result page says so and why.
- **What we don't claim:** private repos and contributions are invisible to us, and the prompt forbids guessing about them. It also forbids judging intelligence, employability or character, and treating stars or commit counts as quality.

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

Fictional users: `lena-bytes` (rich profile), `empty-octo` (no repos), `acme-org` (organization), `rate-limited` (403 with `x-ratelimit-remaining: 0`), `broken-api` (502). Anything else returns 404.

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
- Rate limiting and caches are in memory, per serverless instance.
- Gemini free-tier quotas aren't published per model and are small. When exhausted, roasts fall back to the rules engine (labelled).
- Edited or forged share links show the "doesn't check out" page with HTTP 200 (the page streams under Partial Prerendering) and are `noindex`.

Not affiliated with GitHub, Inc. or Google. Comedy about public repos, not a judgement of anyone's skill.
