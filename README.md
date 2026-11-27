# Internet Roast

**The internet has receipts. Let's use them.**

Paste your Reddit posts, comments and bio. Internet Roast finds your internet personality, roasts you accordingly, and hands you a share card sized for posts and Stories.

- **Next.js 16 (App Router)**, TypeScript, Tailwind CSS v4, React 19
- **Google Gemini** (optional, free tier) for AI-written roasts, with Zod-validated structured output
- **A rules-based "house engine"** that works with no API key at all, and catches every Gemini failure
- **Three share-card styles × two sizes** (1080×1350, 1080×1920), exported client-side to PNG
- **No database, no accounts, no scraping.** Runs on Vercel's free Hobby plan.

---

## How it works

```
/                landing: hero, handle input, example card, how-it-works, privacy
/roast           evidence intake: handle (optional), receipts, bio, context, heat level, consent
POST /api/roast  validate → dedupe/trim → Gemini (or house engine) → sign result → token
/r/[token]       the reveal + Card Studio (style, size, download, share)
/r/[token]/opengraph-image   link-preview image for X, WhatsApp, iMessage…
```

### Why you paste instead of us fetching your profile

Reddit's Data API requires **explicit approval before any access** under its Responsible Builder Policy. The free tier is limited to non-commercial use (100 queries/min per OAuth client), and reports from late 2026 say new public access requests have closed. We could not verify any legitimate, free way for a public web app to read profiles. Scraping or proxying around that would break Reddit's terms, so the app uses a **manual submission workflow**: you paste what you want roasted. The username is display-only and is never looked up.

If you later get approved Reddit API access, add a provider that returns the same `PreparedSubmission` shape (`src/types/roast.ts`). Nothing downstream needs to change.

### Roast generation

`src/lib/roast-engine/index.ts` → `createRoast()`:

1. **Gemini** (when `GEMINI_API_KEY` is set). Server-only, via `@google/genai`:
   - System prompt with voice, grounding rules, sensitive-attribute and harassment bans, and prompt-injection defence (the submission is fenced and treated as data).
   - Intensity (`playful` / `brutal` / `savage`) changes the **prompt itself**, not just the label.
   - `responseMimeType: application/json` + `responseJsonSchema`. Output is then parsed and validated with **Zod** (`src/lib/validation/roast-output.ts`). The score is clamped to the intensity band, and a denylist backstop blocks slurs and self-harm phrasing.
   - SDK retries are **disabled** (`retryOptions.attempts: 1`) to protect free quota. Only on HTTP 429 do we try one other free model once, and that model is put on a cooldown (honouring `retryDelay`) so we stop calling it.
2. **House engine** (no key, or any Gemini failure). `src/lib/roast-engine/{analyze,archetypes,generate}.ts`:
   - Counts real signals: correction phrases ("actually", "source?"), advice phrases, hedges, slang, question/exclamation marks, caps, self-reference, post length, subreddits, 12 interest topics, and 7 contradiction patterns.
   - Scores 10 archetypes (Overthinker, Chronically Online, Unpaid Therapist, Argument Specialist, Digital Detective, Productivity Pretender, Main Character, Certified Lurker, Walking Contradiction, Internet Philosopher).
   - Composes opener + topic jab + **a verbatim quote from your receipts** + secondary-archetype note + kicker, per intensity. Observations come from counted evidence ("8 correction phrases in 5 posts"), never invented numbers.
   - Deterministic: the same input gives the same roast, and different inputs vary.

The UI always says which engine wrote the roast and why (for example "Gemini hit its free daily limit, so the house engine wrote this one"). A fallback is never presented as an AI result.

### Share links without a database

The share URL holds the **generated roast**, never your pasted text: compressed (deflate), base64url, and **HMAC-signed**. Tampered or forged links show a "doesn't check out" page. That stops people from hosting fake roasts with arbitrary text on your domain. Links are about 1–2 KB and never expire. The roast may quote a line of your post, and the UI says so.

### Card export

Cards are plain React components laid out at native resolution. The preview is a CSS-scaled copy. Export renders an **unscaled off-screen copy** with `html-to-image` (MIT).

> **Gotcha we hit and fixed:** html-to-image's built-in font embedding reads `element.style.fontFamily` before the computed style, so inline `var(--font-…)` families never matched and exports silently fell back to Times (wider glyphs, so text overflowed). `src/lib/social-sharing/font-embed.ts` now inlines every same-origin `@font-face` as a data URL instead.

Sharing: **Download PNG**, **native Web Share** (shares the PNG file where `navigator.canShare({files})` allows, as on mobile, and otherwise the link), **Copy link**, **X** intent, **WhatsApp** (`wa.me`). Instagram has no web share intent, so the 9:16 card is made for Stories.

---

## Local setup

Requires Node 20.9+ (tested on Node 22).

```bash
npm install
cp .env.example .env.local     # optional; see below
npm run dev                    # http://localhost:3000
```

With no env vars, development works fully on the house engine. Share links use a dev-only signing secret.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Vitest: engine, validation, Gemini failure modes (mocked), tokens, rate limiter |
| `npm run lint` | ESLint (next/core-web-vitals + TS) |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | No | Enables AI roasts. **Server-only**: never use a `NEXT_PUBLIC_` prefix. Free key: <https://aistudio.google.com/apikey> |
| `ROAST_SIGNING_SECRET` | **Yes in production**, unless `GEMINI_API_KEY` is set | ≥16 chars. `openssl rand -hex 32`. Without either, `/api/roast` returns 503 rather than issue forgeable links. Changing it invalidates old share links. |
| `GEMINI_MODEL` | No | Default `gemini-3.8-flash` |
| `GEMINI_QUOTA_FALLBACK_MODEL` | No | Default `gemini-3.5-flash-lite`. Used only after a 429. `none` disables it. |
| `GEMINI_THINKING_LEVEL` | No | `minimal`/`low` (default)/`medium`/`high`/`off` |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical URL printed on cards and used for metadata. Defaults to Vercel's production URL. |

---

## Deploy to Vercel (Hobby, free)

1. Push this repo to GitHub.
2. In Vercel: **Add New… → Project → Import** the repo. The framework preset is detected as Next.js; keep the defaults.
3. **Settings → Environment Variables** (Production and Preview):
   - `ROAST_SIGNING_SECRET` = output of `openssl rand -hex 32`
   - `GEMINI_API_KEY` = your AI Studio key (optional)
   - `NEXT_PUBLIC_SITE_URL` = `https://<your-project>.vercel.app` or your domain (optional)
4. **Deploy.** Then open the site, roast a sample, download a card, and paste the share link into a chat to check the preview image.

No database, cron, image service or paid add-on is involved. Everything runs in Vercel Functions (Node runtime, as Cache Components requires) plus static assets. Vercel's Hobby plan is for **personal, non-commercial** use. If you monetise, check Vercel's current terms.

---

## Services, costs and limits (verified November 2026)

| Dependency | Cost | Notes / limits |
| --- | --- | --- |
| Reddit Data API | **Not used** | Requires explicit approval, non-commercial free tier, new public requests reportedly closed (Oct 2026). Hence manual paste. |
| Google Gemini API | Free tier (optional) | `gemini-3.8-flash` and `gemini-3.5-flash-lite` show "Free of charge" on the official pricing page. Google **doesn't publish fixed free-tier RPM/RPD**: limits are per project and shown in AI Studio (third-party reports suggest about 20 RPD for 3.8 Flash and about 500 RPD for 3.5 Flash-Lite, so treat these as indicative). RPD resets at midnight Pacific. **On the free tier, Google may use prompts and responses to improve its products**, which the privacy section discloses. Available in about 200 countries. `gemini-2.5-flash` and `gemini-2.5-pro` are deprecated (they reroute from 1 Dec 2026). |
| html-to-image 1.11.x | Free (MIT) | Client-side only. Safari gets a warm-up render pass. |
| Vercel Hobby | Free | Personal/non-commercial use. |
| Fonts (Anton, Instrument Serif, Archivo, IBM Plex Mono) | Free (OFL) | Self-hosted in `src/fonts`, so builds need no network. |

### Known limitations

- **Rate limiting is in-memory and per instance** (5/min and 30/day per IP). On serverless it's a guardrail against bursts, not a global limit. For a hard global cap, add Upstash Redis (free tier) or Vercel's firewall rules.
- **Gemini free-tier quotas are small and opaque.** A viral spike will exhaust them fast. The app then falls back to the house engine and says so. Raise limits by linking billing (paid) or switching `GEMINI_MODEL` to a higher-quota free model.
- **Forged or edited share links render the "doesn't check out" page with HTTP 200**, not 404, because the page streams under Partial Prerendering. They're also `noindex`.
- The Web Share API isn't available in all desktop browsers. The Share button only appears where it's supported.
- The house engine is English-only, and its topic and marker lists are heuristic.

---

## Project structure

```
src/
  app/
    page.tsx                      landing
    roast/page.tsx                input
    r/[token]/page.tsx            result (reveal + card studio)
    r/[token]/opengraph-image.tsx link previews
    api/roast/route.ts            POST handler: validation, rate limit, generation, signing
  components/
    landing/  roast/  results/  share-cards/  ui/
  lib/
    gemini/            client.ts (SDK, error classification), prompt.ts
    roast-engine/      analyze.ts, archetypes.ts, generate.ts, index.ts (orchestrator)
    validation/        input.ts, reddit-handle.ts, prepare.ts, roast-output.ts
    share/token.ts     signed, compressed share tokens
    social-sharing/    links.ts, font-embed.ts
    rate-limit.ts
  types/roast.ts
tests/                 vitest suites
```

## Safety and privacy

- Submitted text is processed once in memory and **never stored or logged**. Only the generated roast leaves the server.
- All user and model text is rendered as React text nodes, with no `dangerouslySetInnerHTML`.
- The prompt forbids sensitive-attribute inferences (health, identity, ethnicity, religion, appearance and so on), threats and slurs. Output passes through Zod and a denylist.
- A consent checkbox asks users to roast only themselves or friends who are in on it.

_Not affiliated with Reddit or Google. Comedy, not a psychological assessment._
