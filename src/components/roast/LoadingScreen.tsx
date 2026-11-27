"use client";

import { useEffect, useState } from "react";
import type { Intensity } from "@/types/roast";

const LINES = [
  "Reading your receipts",
  "Cross-referencing your opinions with your other opinions",
  "Counting every 'actually'",
  "Looking for the contradiction you hoped we'd miss",
  "Consulting the comment section",
  "Sharpening the punchlines",
  "Drafting your personality title",
];

export function LoadingScreen({ intensity }: { intensity: Intensity }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 1700);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-paper" role="status" aria-live="polite" aria-label="Writing your roast">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-acid">Case in progress · {intensity} mode</p>
        <p className="mt-6 font-display text-[clamp(3rem,12vw,7rem)] uppercase leading-[0.88]">
          Hold still.
          <br />
          <span className="text-heat">This might sting.</span>
        </p>
        <div className="relative mt-10 h-2 overflow-hidden bg-ink-3" aria-hidden>
          <div className="absolute inset-y-0 w-1/3 animate-scan bg-acid" />
        </div>
        <p key={i} className="mt-5 min-h-7 animate-rise font-mono text-sm uppercase tracking-[0.1em] text-bone">
          {LINES[i]}…
        </p>
      </div>
    </div>
  );
}
