import type { CommitSample, Fact, LanguageShare, ProfileSummary, ReadmeInsight, RepoSummary } from "./github";

export const INTENSITIES = ["mild", "spicy", "scorched"] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const CATEGORIES = ["graveyard", "readme", "languages", "presentation", "stars", "activity", "pinned", "personality"] as const;
export type CategoryId = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  graveyard: "Repository graveyard",
  readme: "README quality",
  languages: "Language identity crisis",
  presentation: "Project presentation",
  stars: "Star economy",
  activity: "Activity patterns",
  pinned: "Pinned choices",
  personality: "Developer personality",
};

export type EvidenceKind = "repo" | "fact" | "commit" | "readme";
export interface EvidenceRef {
  kind: EvidenceKind;
  /** Repo name (repo/readme), fact id (fact) or commit id like "c3" (commit). */
  ref: string;
}

export interface ReviewComment {
  category: CategoryId;
  title: string;
  roast: string;
  evidence: EvidenceRef[];
}

export interface RoastResult {
  headline: string;
  archetype: string;
  summary: string;
  mainRoast: string;
  comments: ReviewComment[];
  closingLine: string;
}

export type RoastSource = "gemini" | "engine";
export type FallbackReason = "unconfigured" | "quota" | "unavailable" | "invalid_output" | "blocked";

/**
 * Everything the result page needs, signed into the share link. Contains only
 * public GitHub data that the roast references, never tokens or raw READMEs.
 */
export interface RoastRecord {
  v: 2;
  caseId: string;
  intensity: Intensity;
  profile: ProfileSummary;
  result: RoastResult;
  facts: Fact[];
  repos: RepoSummary[];
  readmes: ReadmeInsight[];
  commits: CommitSample[];
  languages: LanguageShare[];
  pinned: string[] | null;
  source: RoastSource;
  model?: string;
  fallbackReason?: FallbackReason;
  createdAt: number;
}
