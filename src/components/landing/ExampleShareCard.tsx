"use client";

import { ShareCard, CARD_SIZES } from "@/components/share/ShareCard";
import { ScaledCard } from "@/components/share/ScaledCard";
import { EXAMPLE_RECORD } from "@/lib/example";

export function ExampleShareCard({ host }: { host: string }) {
  const { width, height } = CARD_SIZES.landscape;
  return (
    <figure>
      <div className="overflow-hidden rounded-lg border border-line shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
        <ScaledCard width={width} height={height} label="Example share image for the fictional profile example-dev">
          <ShareCard record={EXAMPLE_RECORD} format="landscape" host={host} avatarSrc={null} />
        </ScaledCard>
      </div>
      <figcaption className="mt-3 text-[13px] text-faint">Example share image (fictional profile), 1200×630.</figcaption>
    </figure>
  );
}
