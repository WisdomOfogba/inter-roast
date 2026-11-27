import type { CSSProperties } from "react";
import type { RoastRecord } from "@/types/roast";

export type CardFormat = "post" | "story";
export type CardStyle = "report" | "exposed" | "diagnosis";

export const CARD_SIZES: Record<CardFormat, { width: number; height: number; label: string }> = {
  post: { width: 1080, height: 1350, label: "Post 4:5" },
  story: { width: 1080, height: 1920, label: "Story 9:16" },
};

export const CARD_STYLES: { id: CardStyle; name: string; blurb: string }[] = [
  { id: "report", name: "Official Report", blurb: "Editorial, black & white" },
  { id: "exposed", name: "Internet Exposed Me", blurb: "Loud, acid, meme-ready" },
  { id: "diagnosis", name: "Personality Diagnosis", blurb: "Mock clinical printout" },
];

export interface CardProps {
  record: RoastRecord;
  format: CardFormat;
  host: string;
}

export const F = {
  display: "var(--font-display)",
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
} as const;

export const C = {
  ink: "#0d0d0c",
  ink2: "#1a1a18",
  ink3: "#2a2a27",
  paper: "#f2eee5",
  paper2: "#e8e3d7",
  bone: "#d6cfc0",
  stone: "#6b665c",
  stoneLight: "#a39d90",
  acid: "#e4ff3a",
  heat: "#ff3b1f",
} as const;

/**
 * Pick a font size from a ladder based on text length. Each step is
 * [maxChars, size]. Sizes were tuned by rendering the longest allowed text.
 */
export function fit(text: string, ladder: [number, number][], fallback: number): number {
  for (const [max, size] of ladder) if (text.length <= max) return size;
  return fallback;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

export const subjectLabel = (r: RoastRecord) => (r.handle ? `u/${r.handle}` : "ANONYMOUS SUBJECT");

export const cardRoot = (format: CardFormat, extra: CSSProperties): CSSProperties => ({
  width: CARD_SIZES[format].width,
  height: CARD_SIZES[format].height,
  position: "relative",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  WebkitFontSmoothing: "antialiased",
  ...extra,
});

/** Ten-segment meter, filled to the score. */
export function ScoreBar({ score, on, off, height = 22, gap = 6 }: { score: number; on: string; off: string; height?: number; gap?: number }) {
  const filled = Math.round(score);
  return (
    <div style={{ display: "flex", gap }} aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ flex: 1, height, background: i < filled ? on : off }} />
      ))}
    </div>
  );
}

export function Wordmark({ color, size = 30, accent }: { color: string; size?: number; accent?: string }) {
  return (
    <div style={{ fontFamily: F.display, fontSize: size, lineHeight: 1, letterSpacing: "0.01em", color, display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <span style={{ display: "inline-block", width: size * 0.62, height: size * 0.62, background: accent ?? C.heat, transform: "rotate(45deg)" }} />
      INTERNET ROAST
    </div>
  );
}
