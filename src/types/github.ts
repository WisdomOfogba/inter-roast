/** Normalised, public-only GitHub footprint the roast is built from. */

export interface ProfileSummary {
  login: string;
  id: number;
  name: string | null;
  bio: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  createdAt: string;
}

export interface RepoSummary {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  isFork: boolean;
  archived: boolean;
  hasHomepage: boolean;
  hasLicense: boolean;
  sizeKb: number;
  createdAt: string;
  pushedAt: string | null;
}

export interface ReadmeInsight {
  repo: string;
  missing: boolean;
  words: number;
  headings: number;
  codeBlocks: number;
  images: number;
  badges: number;
  hasInstall: boolean;
  hasUsage: boolean;
  /** Matches a known framework starter README (CRA, Vite, Next…). */
  template: string | null;
  /** First ~300 chars of prose, markdown stripped. */
  excerpt: string;
}

export interface CommitSample {
  id: string; // "c1", "c2"… stable reference for evidence
  repo: string;
  message: string; // first line only
  date: string | null;
}

export interface ActivitySummary {
  /** False when the events endpoint failed or returned nothing. */
  available: boolean;
  eventCount: number;
  byType: Record<string, number>;
  firstEventAt: string | null;
  lastEventAt: string | null;
  activeDays: number;
  /** Only present when a GitHub token enabled the GraphQL call. */
  contributionsLastYear: number | null;
}

export interface LanguageShare {
  name: string;
  repos: number;
}

export interface Fact {
  id: string;
  label: string;
  value: string;
  /** Plain-language definition shown next to the number. */
  definition: string;
}

export interface Footprint {
  profile: ProfileSummary;
  /** Repos we listed (most recently pushed first, max 100). */
  repos: RepoSummary[];
  readmes: ReadmeInsight[];
  commits: CommitSample[];
  activity: ActivitySummary;
  /** null when pinned repos couldn't be read (needs a GitHub token). */
  pinned: string[] | null;
  languages: LanguageShare[];
  facts: Fact[];
  fetchedAt: string;
  /** When GitHub served the profile (from its Date header; older if served from cache). */
  dataAsOf: string;
}

export type CollectStage = "profile" | "repos" | "readmes" | "activity" | "roast";

export interface StageEvent {
  type: "stage";
  stage: CollectStage;
  status: "start" | "done" | "skipped";
  detail?: string;
}
