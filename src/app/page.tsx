import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RoastForm } from "@/components/landing/RoastForm";
import { BurningGraph } from "@/components/landing/BurningGraph";
import { ReviewView } from "@/components/review/ReviewView";
import { ExampleShareCard } from "@/components/landing/ExampleShareCard";
import { ReadTree } from "@/components/landing/ReadTree";
import { Link2, MessageSquareWarning, ScanSearch } from "lucide-react";
import { EXAMPLE_NOW, EXAMPLE_RECORD } from "@/lib/example";
import { siteHost } from "@/lib/social-sharing/links";
import { siteUrl } from "@/lib/site";

const STEPS = [
  {
    icon: Link2,
    title: "Drop your GitHub profile",
    body: "Paste a link like github.com/your-username. No login, no OAuth, nothing to install.",
    code: "github.com/your-username",
  },
  {
    icon: ScanSearch,
    title: "We inspect your public footprint",
    body: "Your profile, up to 100 recently pushed repos, up to 5 READMEs, your public events and a sample of recent commit messages, all from the official GitHub API.",
    code: "GET /users/{user}/repos?sort=pushed",
  },
  {
    icon: MessageSquareWarning,
    title: "Get your code review",
    body: "Gemini writes the roast as review comments. Every repo, commit and number it cites is checked against what GitHub returned before you see it.",
    code: "Changes requested",
  },
];

export default function Home() {
  const host = siteHost(siteUrl());
  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1">
        {/* Hero */}
        <section id="roast" className="scroll-mt-14 border-b border-line">
          <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-20">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div className="max-w-3xl">
              <h1 className="display text-[clamp(2.6rem,8vw,5.25rem)] [text-wrap:balance]">Your GitHub has some explaining to do.</h1>
              <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-muted sm:text-xl">
                Drop your GitHub profile. We&apos;ll inspect your public repositories, investigate your README files and expose your developer habits.
              </p>
              <div className="mt-9 max-w-2xl">
                <RoastForm />
              </div>
            </div>
            <div className="hidden lg:block">
              <ReadTree />
            </div>
            </div>
            <figure className="mt-14 sm:mt-16">
              <BurningGraph className="w-full" />
              <figcaption className="mt-3 flex justify-between gap-4 text-[13px] text-faint">
                <span>
                  <span className="sm:hidden">Before</span>
                  <span className="hidden sm:inline">Your contribution graph</span>
                </span>
                <span>
                  <span className="sm:hidden">After review</span>
                  <span className="hidden sm:inline">Your contribution graph after review</span>
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Example */}
        <section id="example" aria-labelledby="example-title" className="scroll-mt-14 border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
              <div className="lg:pt-2">
                <h2 id="example-title" className="display text-[clamp(2rem,5vw,3rem)]">What a roast looks like</h2>
                <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">
                  A verdict, a diagnosis, and review comments with the receipts attached: the actual repos, READMEs and commit messages behind each joke.
                </p>
                <p className="mt-6 inline-flex items-center gap-2 rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-[14px] text-amber">
                  Fictional profile and data, made up for this example.
                </p>
              </div>
              <div className="rounded-xl border border-line bg-panel/40 p-4 sm:p-7">
                <ReviewView record={EXAMPLE_RECORD} compact avatarSrc={null} now={EXAMPLE_NOW} linkable={false} />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-14 border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <h2 id="how-title" className="display text-[clamp(2rem,5vw,3rem)]">How it works</h2>
            <ol className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex min-w-0 flex-col bg-canvas p-6 sm:p-7">
                  <span className="flex items-center justify-between">
                    <span className="font-mono text-[14px] text-commit">Step {i + 1}</span>
                    <s.icon className="size-5 text-muted" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em]">{s.title}</h3>
                  <p className="mt-2 flex-1 text-[16px] leading-relaxed text-muted">{s.body}</p>
                  <code className="mt-6 block rounded-md [overflow-wrap:anywhere] border border-line bg-panel px-3 py-2 font-mono text-[13px] text-fg/80">
                    {s.code}
                  </code>
                </li>
              ))}
            </ol>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
              We only see what GitHub shows the public. Private repositories, private contributions and anything behind a login stay invisible, so the roast never
              guesses about them.
            </p>
          </div>
        </section>

        {/* Sharing */}
        <section aria-labelledby="share-title">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <h2 id="share-title" className="display text-[clamp(2rem,5vw,3rem)]">Built to be screenshotted</h2>
              <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">
                Every roast gets its own link and a share image sized for X, LinkedIn and group chats. Roast yourself first, then send it to the friend who
                still commits straight to main.
              </p>
              <a
                href="#roast"
                className="mt-7 inline-flex min-h-12 items-center rounded-md bg-commit px-5 text-base font-semibold text-commit-ink transition-colors hover:bg-commit-hover"
              >
                Roast a profile
              </a>
            </div>
            <ExampleShareCard host={host} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
