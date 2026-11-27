import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Masthead } from "@/components/ui/Masthead";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { HandleForm } from "@/components/landing/HandleForm";
import { ExampleCard } from "@/components/landing/ExampleCard";
import { Ticker } from "@/components/landing/Ticker";
import { siteUrl } from "@/lib/site";
import { siteHost } from "@/lib/social-sharing/links";

const STEPS = [
  {
    n: "01",
    title: "Bring the receipts",
    body: "Copy a handful of your Reddit posts, comments or your bio and paste them in. Five to ten is the sweet spot. The more you give, the more personal it gets.",
  },
  {
    n: "02",
    title: "We read every word",
    body: "Our roast writer looks for recurring topics, verbal tics, contradictions and how you argue, then picks your internet personality. It only uses what you pasted.",
  },
  {
    n: "03",
    title: "You get exposed",
    body: "A personality title, a full roast, three observations with receipts, and a share card sized for posts and Stories. Then you roast your friends.",
  },
];

export default function Home() {
  const host = siteHost(siteUrl());
  return (
    <>
      <Masthead />
      <main id="main" className="flex-1">
        {/* HERO */}
        <section className="grain border-b-2 border-ink">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:gap-10 lg:pb-20">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-ink pb-3 font-mono text-[11px] uppercase tracking-[0.16em]">
                <span className="bg-ink px-2 py-0.5 text-acid">Issue 001</span>
                <span>The roast issue</span>
                <span className="text-stone">Reddit edition</span>
              </div>

              <h1 className="mt-6 font-display text-[clamp(3.4rem,14.5vw,6.5rem)] uppercase leading-[0.9] tracking-[-0.01em] lg:text-[clamp(5.5rem,8.4vw,8.6rem)]">
                The internet
                <br />
                has <span className="relative inline-block">
                  <span className="relative z-10">receipts.</span>
                  <span aria-hidden className="absolute inset-x-[-0.04em] bottom-[0.08em] top-[0.52em] -z-0 bg-acid" />
                </span>
              </h1>

              <p className="mt-6 max-w-2xl font-serif text-[clamp(1.6rem,4.6vw,2.6rem)] italic leading-[1.08]">
                Let&apos;s see what your digital personality says about you.
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-ink/80 sm:text-lg">
                Drop your Reddit profile or bring your own posts. We&apos;ll find your internet personality and roast you accordingly.
              </p>

              <div className="mt-8">
                <HandleForm />
                <Link
                  href="/roast"
                  className="mt-5 inline-flex min-h-11 items-center gap-1.5 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] underline decoration-2 underline-offset-4 hover:text-heat-deep"
                >
                  No username? Just paste your posts <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-end lg:pt-10">
              <ExampleCard host={host} />
            </div>
          </div>
        </section>

        <Ticker />

        {/* HOW IT WORKS */}
        <section aria-labelledby="how" className="border-b-2 border-ink">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="how" className="font-display text-5xl uppercase leading-none sm:text-7xl">How it works</h2>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone">Three steps · about a minute · zero dignity</p>
            </div>
            <ol className="mt-10 border-t-2 border-ink">
              {STEPS.map((s) => (
                <li key={s.n} className="grid gap-3 border-b-2 border-ink py-7 sm:grid-cols-[120px_minmax(0,0.9fr)_minmax(0,1.1fr)] sm:items-baseline sm:gap-8">
                  <span className="font-display text-6xl leading-none text-heat sm:text-7xl">{s.n}</span>
                  <h3 className="font-display text-3xl uppercase leading-none sm:text-4xl">{s.title}</h3>
                  <p className="max-w-xl text-base leading-relaxed text-ink/80 sm:text-lg">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PRIVACY + DISCLAIMER */}
        <section aria-labelledby="privacy" className="bg-paper-2">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2">
            <div>
              <h2 id="privacy" className="font-display text-4xl uppercase leading-none sm:text-5xl">What happens to your stuff</h2>
              <ul className="mt-6 space-y-4 text-base leading-relaxed">
                {[
                  ["Nothing is stored.", "No database, no accounts. Your pasted text is used once to write the roast, then discarded."],
                  ["Nothing is scraped.", "Reddit's API requires approval we don't have, so we never fetch your profile. You choose exactly what to share."],
                  ["Share links carry the roast, not your posts.", "The link is a signed copy of the result. It may quote a line or two of yours, so share wisely."],
                  ["AI processing.", "When enabled, your text is sent to Google's Gemini API to write the roast. On its free tier, Google may use inputs to improve its products. Don't paste anything private."],
                ].map(([t, b]) => (
                  <li key={t} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
                    <span aria-hidden className="mt-2 inline-block size-2.5 rotate-45 bg-ink" />
                    <span>
                      <strong className="font-bold">{t}</strong> <span className="text-ink/80">{b}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="self-start border-2 border-ink bg-paper p-6 sm:p-8">
              <p className="inline-block -rotate-2 border-2 border-heat px-3 py-1 font-display text-2xl tracking-wide text-heat">DISCLAIMER</p>
              <p className="mt-5 font-serif text-2xl italic leading-snug sm:text-3xl">
                This is comedy, not a psychological assessment. We roast posting habits, not people.
              </p>
              <p className="mt-4 text-base leading-relaxed text-ink/80">
                No diagnoses, no judgments about who you are, and nothing about sensitive stuff like health, identity or background. Only roast yourself, or a
                friend who has agreed to be roasted.
              </p>
              <Link
                href="/roast"
                className="mt-6 inline-flex min-h-12 items-center gap-2 bg-ink px-5 font-display text-xl tracking-wide text-acid transition-colors hover:bg-heat hover:text-ink"
              >
                I&apos;M READY. ROAST ME <ArrowUpRight className="size-5" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
