"use client";

import { ExposedCard } from "@/components/share-cards/ExposedCard";
import { ScaledCard } from "@/components/share-cards/ScaledCard";
import { EXAMPLE_RECORD } from "@/lib/example";

export function ExampleCard({ host }: { host: string }) {
  return (
    <figure className="relative mx-auto w-full max-w-[380px]">
      <div className="absolute -left-3 -top-4 z-10 rotate-[-4deg] bg-ink px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-acid">
        Exhibit A · Example roast
      </div>
      <div className="rotate-[2.5deg] border-2 border-ink shadow-[12px_12px_0_0_#0d0d0c] transition-transform duration-500 hover:rotate-0">
        <ScaledCard format="post" label="Example share card: The Spreadsheet Romantic, roast rating 8.7 out of 10">
          <ExposedCard record={EXAMPLE_RECORD} format="post" host={host} />
        </ScaledCard>
      </div>
      <figcaption className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-stone">
        Sample card for a fictional user. Yours is built from your receipts.
      </figcaption>
    </figure>
  );
}
