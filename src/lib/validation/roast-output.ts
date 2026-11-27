import { z } from "zod";
import { CATEGORIES, type ReviewComment, type RoastResult } from "@/types/roast";
import type { Footprint } from "@/types/github";

const text = (min: number, max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(min).max(max));

export const evidenceSchema = z.object({
  kind: z.enum(["repo", "fact", "commit", "readme"]),
  ref: text(1, 120),
});

export const commentSchema = z.object({
  category: z.enum(CATEGORIES),
  title: text(4, 80),
  roast: text(30, 480),
  evidence: z.array(evidenceSchema).min(1).max(4),
});

/** Validates untrusted model output. Lengths keep layouts and cards safe. */
export const roastOutputSchema = z.object({
  headline: text(10, 110),
  archetype: text(4, 50),
  summary: text(30, 300),
  mainRoast: text(150, 1200),
  comments: z.array(commentSchema).min(3).max(6),
  closingLine: text(10, 200),
});

/** JSON Schema for Gemini's structured output (mirrors the Zod schema). */
export const roastOutputJsonSchema = {
  type: "object",
  properties: {
    headline: { type: "string", description: "Short, memorable roast headline, max 100 chars. Specific to this profile." },
    archetype: { type: "string", description: "Original developer archetype starting with 'The', 2-5 words." },
    summary: { type: "string", description: "Review summary in 1-2 sentences, max 260 chars." },
    mainRoast: { type: "string", description: "The main roast, 3-6 sentences, 400-1000 chars, citing specific repos or facts." },
    comments: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: [...CATEGORIES] },
          title: { type: "string", description: "Punchy comment title, max 70 chars." },
          roast: { type: "string", description: "2-3 sentences, max 420 chars, grounded in the cited evidence." },
          evidence: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: {
              type: "object",
              properties: {
                kind: { type: "string", enum: ["repo", "fact", "commit", "readme"] },
                ref: { type: "string", description: "Exact repo name, fact id, or commit id (c1, c2…) from the data." },
              },
              required: ["kind", "ref"],
            },
          },
        },
        required: ["category", "title", "roast", "evidence"],
      },
    },
    closingLine: { type: "string", description: "One memorable final punchline, max 180 chars." },
  },
  required: ["headline", "archetype", "summary", "mainRoast", "comments", "closingLine"],
} as const;

/**
 * Drop evidence that doesn't point at real retrieved data, then drop comments
 * left with no evidence. This is what keeps every joke traceable.
 */
export function groundComments(comments: ReviewComment[], fp: Pick<Footprint, "repos" | "facts" | "commits" | "readmes">): ReviewComment[] {
  const repoNames = new Map(fp.repos.map((r) => [r.name.toLowerCase(), r.name]));
  const factIds = new Set(fp.facts.map((f) => f.id));
  const commitIds = new Set(fp.commits.map((c) => c.id));
  const readmeRepos = new Map(fp.readmes.map((r) => [r.repo.toLowerCase(), r.repo]));
  const seenCategories = new Set<string>();

  const out: ReviewComment[] = [];
  for (const c of comments) {
    const evidence = c.evidence
      .map((e) => {
        const ref = e.ref.trim().replace(/^.*\//, ""); // tolerate "owner/repo"
        if (e.kind === "repo") return repoNames.has(ref.toLowerCase()) ? { kind: e.kind, ref: repoNames.get(ref.toLowerCase())! } : null;
        if (e.kind === "readme") return readmeRepos.has(ref.toLowerCase()) ? { kind: e.kind, ref: readmeRepos.get(ref.toLowerCase())! } : null;
        if (e.kind === "fact") return factIds.has(ref) ? { kind: e.kind, ref } : null;
        return commitIds.has(ref) ? { kind: e.kind, ref } : null;
      })
      .filter((e): e is ReviewComment["evidence"][number] => e !== null)
      .filter((e, i, arr) => arr.findIndex((x) => x.kind === e.kind && x.ref === e.ref) === i);
    if (!evidence.length || seenCategories.has(c.category)) continue;
    seenCategories.add(c.category);
    out.push({ ...c, evidence });
  }
  return out;
}

const DENYLIST = [
  /\bkill (?:your|ur)self\b/i, /\bkys\b/i, /\bunalive\b/i,
  /\bn[i1]gg(?:er|a)s?\b/i, /\bf[a@]gg?(?:ot)?s?\b/i, /\bretard(?:ed|s)?\b/i, /\btrann(?:y|ies)\b/i,
  /\bkike\b/i, /\bspic\b/i, /\bchink\b/i,
  /\b(unemployable|you(?:'ll| will) never get (?:a|hired))\b/i,
];

export function containsBlockedContent(r: RoastResult): boolean {
  const all = [r.headline, r.archetype, r.summary, r.mainRoast, r.closingLine, ...r.comments.flatMap((c) => [c.title, c.roast])].join("\n");
  return DENYLIST.some((re) => re.test(all));
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

/** Parse + validate + ground raw model text, or throw. */
export function parseModelOutput(raw: string | undefined, fp: Pick<Footprint, "repos" | "facts" | "commits" | "readmes">): RoastResult {
  if (!raw) throw new InvalidOutputError("empty response");
  let json: unknown;
  try {
    json = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));
  } catch {
    throw new InvalidOutputError("response was not JSON");
  }
  const parsed = roastOutputSchema.safeParse(json);
  if (!parsed.success) throw new InvalidOutputError(parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  const comments = groundComments(parsed.data.comments, fp);
  if (comments.length < 2) throw new InvalidOutputError("too few comments with real evidence");
  const result: RoastResult = { ...parsed.data, comments };
  if (containsBlockedContent(result)) throw new BlockedOutputError();
  return result;
}
