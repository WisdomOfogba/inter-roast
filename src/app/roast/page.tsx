import { Suspense } from "react";
import type { Metadata } from "next";
import { Masthead } from "@/components/ui/Masthead";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { RoastForm } from "@/components/roast/RoastForm";

export const metadata: Metadata = {
  title: "Bring the receipts",
  description: "Paste your Reddit posts, comments and bio. Pick a heat level. Get roasted.",
};

export default function RoastPage() {
  return (
    <>
      <Masthead />
      <main id="main" className="grain flex-1">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-16">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone">Step 2 of 2 · Evidence intake</p>
            <h1 className="mt-4 font-display text-[clamp(3.2rem,11vw,6.5rem)] uppercase leading-[0.86]">
              Bring the <span className="hl">receipts.</span>
            </h1>
            <p className="mt-5 max-w-md font-serif text-2xl italic leading-snug">
              We only roast what you show us. Paste a few posts and comments and we&apos;ll take it from there.
            </p>
            <div className="mt-8 max-w-md border-2 border-ink bg-paper p-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">Why we can&apos;t just look you up</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
                Reddit&apos;s Data API requires explicit approval and isn&apos;t open to new public apps. We won&apos;t scrape around that, so you
                bring the evidence. Bonus: you control exactly what gets roasted.
              </p>
            </div>
          </aside>
          <section aria-label="Roast form">
            <Suspense fallback={<div className="h-[60vh] animate-pulse bg-paper-2" />}>
              <RoastForm />
            </Suspense>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
