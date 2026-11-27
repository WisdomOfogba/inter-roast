export const INTENSITIES = ["playful", "brutal", "savage"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export interface Indicator {
  /** Short behaviour label, e.g. "Reply velocity". */
  label: string;
  /** 1–5 severity, vibes-based. */
  level: number;
}

/** The structured roast every provider (Gemini or the local engine) must produce. */
export interface RoastResult {
  personalityTitle: string;
  personalityDescription: string;
  /** Short, meme-able headline used on the "Exposed" card. */
  headline: string;
  mainRoast: string;
  observations: [string, string, string];
  personalityTraits: string[];
  /** Internet behaviour classification, e.g. "Comment-section litigator, Class II". */
  behaviourClass: string;
  indicators: Indicator[];
  roastScore: number;
  roastIntensity: Intensity;
  closingStatement: string;
}

export type RoastSource = "gemini" | "engine";

export type FallbackReason =
  | "unconfigured"
  | "quota"
  | "unavailable"
  | "invalid_output"
  | "blocked";

/** What gets signed into a share link. Never contains the raw submission. */
export interface RoastRecord {
  v: 1;
  /** Short human-readable case number shown on cards. */
  caseId: string;
  handle: string | null;
  result: RoastResult;
  source: RoastSource;
  model?: string;
  fallbackReason?: FallbackReason;
  /** True when the submission was too thin to say much. */
  sparse: boolean;
  createdAt: number;
}

export interface PreparedSubmission {
  handle: string | null;
  bio: string;
  items: string[];
  context: string;
  stats: {
    itemCount: number;
    wordCount: number;
    charCount: number;
    duplicatesRemoved: number;
    truncated: boolean;
    sparse: boolean;
  };
}
