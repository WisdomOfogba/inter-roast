import { z } from "zod";
import { INTENSITIES, type Intensity, type RoastResult } from "@/types/roast";

const text = (min: number, max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(min).max(max));

/**
 * Validates untrusted model output. Lengths are generous enough for good
 * writing and tight enough that cards never overflow.
 */
export const roastOutputSchema = z.object({
  personalityTitle: text(6, 60),
  personalityDescription: text(20, 260),
  headline: text(6, 70),
  mainRoast: text(80, 900),
  observations: z.array(text(15, 220)).length(3),
  personalityTraits: z.array(text(2, 28)).min(3).max(5),
  behaviourClass: text(4, 70),
  indicators: z
    .array(
      z.object({
        label: text(2, 32),
        level: z.number().int().min(1).max(5),
      }),
    )
    .length(3),
  roastScore: z.number().min(0).max(10),
  roastIntensity: z.enum(INTENSITIES),
  closingStatement: text(10, 200),
});

export type RoastOutput = z.output<typeof roastOutputSchema>;

/** JSON Schema handed to Gemini's structured-output mode (mirrors the Zod schema). */
export const roastOutputJsonSchema = {
  type: "object",
  properties: {
    personalityTitle: {
      type: "string",
      description: "Archetype name starting with 'The', 2–6 words, Title Case. Original, specific to this person.",
    },
    personalityDescription: { type: "string", description: "1–2 sentences, max 240 characters." },
    headline: {
      type: "string",
      description: "First-person confession for a meme card, ALL CAPS friendly, max 60 characters.",
    },
    mainRoast: { type: "string", description: "The main roast. 3–6 sentences, 300–800 characters." },
    observations: {
      type: "array",
      items: { type: "string", description: "One specific observation, max 200 characters." },
      minItems: 3,
      maxItems: 3,
    },
    personalityTraits: {
      type: "array",
      items: { type: "string", description: "1–3 words." },
      minItems: 3,
      maxItems: 5,
    },
    behaviourClass: {
      type: "string",
      description: "Mock-official internet behaviour classification, max 60 characters.",
    },
    indicators: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Behaviour indicator, 1–3 words." },
          level: { type: "integer", minimum: 1, maximum: 5 },
        },
        required: ["label", "level"],
      },
    },
    roastScore: { type: "number", minimum: 0, maximum: 10 },
    roastIntensity: { type: "string", enum: [...INTENSITIES] },
    closingStatement: { type: "string", description: "One memorable final punchline, max 180 characters." },
  },
  required: [
    "personalityTitle",
    "personalityDescription",
    "headline",
    "mainRoast",
    "observations",
    "personalityTraits",
    "behaviourClass",
    "indicators",
    "roastScore",
    "roastIntensity",
    "closingStatement",
  ],
} as const;

export const SCORE_BANDS: Record<Intensity, [number, number]> = {
  playful: [3.0, 6.4],
  brutal: [6.5, 8.4],
  savage: [8.5, 9.9],
};

export function clampScore(score: number, intensity: Intensity): number {
  const [lo, hi] = SCORE_BANDS[intensity];
  const s = Number.isFinite(score) ? score : (lo + hi) / 2;
  return Math.round(Math.min(hi, Math.max(lo, s)) * 10) / 10;
}

/**
 * A deliberately small denylist backstop. The prompt and Gemini's own safety
 * filters do the heavy lifting; this catches the obvious failure cases.
 */
const DENYLIST = [
  /\bkill (?:your|ur)self\b/i,
  /\bkys\b/i,
  /\bunalive (?:your|ur)self\b/i,
  /\bn[i1]gg(?:er|a)s?\b/i,
  /\bf[a@]gg?(?:ot)?s?\b/i,
  /\bretard(?:ed|s)?\b/i,
  /\btrann(?:y|ies)\b/i,
  /\bkike\b/i,
  /\bspic\b/i,
  /\bchink\b/i,
  /\bi(?:'ll| will) (?:find|hurt|kill) you\b/i,
];

export function containsBlockedContent(result: Pick<RoastResult, "mainRoast" | "observations" | "closingStatement" | "personalityTitle" | "headline" | "personalityDescription">): boolean {
  const all = [
    result.personalityTitle,
    result.headline,
    result.personalityDescription,
    result.mainRoast,
    result.closingStatement,
    ...result.observations,
  ].join("\n");
  return DENYLIST.some((re) => re.test(all));
}

/** Parse + validate raw model text into a RoastResult, or throw. */
export function parseModelOutput(raw: string | undefined, intensity: Intensity): RoastResult {
  if (!raw) throw new InvalidOutputError("empty response");
  let json: unknown;
  try {
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    json = JSON.parse(stripped);
  } catch {
    throw new InvalidOutputError("response was not JSON");
  }
  const parsed = roastOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new InvalidOutputError(parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; "));
  }
  const out = parsed.data;
  const result: RoastResult = {
    ...out,
    observations: [out.observations[0], out.observations[1], out.observations[2]],
    // The requested intensity is authoritative; the model doesn't get to relabel it.
    roastIntensity: intensity,
    roastScore: clampScore(out.roastScore, intensity),
  };
  if (containsBlockedContent(result)) throw new BlockedOutputError();
  return result;
}

export class InvalidOutputError extends Error {
  constructor(detail: string) {
    super(`Invalid model output: ${detail}`);
    this.name = "InvalidOutputError";
  }
}

export class BlockedOutputError extends Error {
  constructor() {
    super("Model output failed the safety backstop");
    this.name = "BlockedOutputError";
  }
}
