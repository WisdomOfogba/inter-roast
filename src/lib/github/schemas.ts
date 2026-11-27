import { z } from "zod";

/**
 * Lenient schemas for the GitHub REST responses we read. We only pick the
 * fields we use; anything missing becomes null rather than crashing.
 */
const nstr = z.string().nullable().optional().transform((v) => v ?? null);
const nnum = z.number().nullable().optional().transform((v) => v ?? 0);

export const userSchema = z.object({
  login: z.string(),
  id: z.number(),
  type: z.string().optional().default("User"),
  name: nstr,
  bio: nstr,
  avatar_url: z.string().url(),
  html_url: z.string().url(),
  followers: nnum,
  following: nnum,
  public_repos: nnum,
  public_gists: nnum,
  created_at: z.string(),
});
export type GitHubUserRaw = z.output<typeof userSchema>;

export const repoSchema = z.object({
  name: z.string(),
  description: nstr,
  fork: z.boolean().optional().default(false),
  archived: z.boolean().optional().default(false),
  language: nstr,
  stargazers_count: nnum,
  forks_count: nnum,
  open_issues_count: nnum,
  topics: z.array(z.string()).optional().default([]),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: nstr,
  homepage: nstr,
  size: nnum,
  license: z.object({ spdx_id: nstr }).nullable().optional(),
});
export const reposSchema = z.array(repoSchema);
export type GitHubRepoRaw = z.output<typeof repoSchema>;

export const eventSchema = z.object({
  type: nstr,
  created_at: z.string(),
  repo: z.object({ name: z.string() }).optional(),
});
export const eventsSchema = z.array(eventSchema);

export const commitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    message: z.string(),
    author: z.object({ date: nstr }).nullable().optional(),
  }),
});
export const commitsSchema = z.array(commitSchema);

export const graphqlSchema = z.object({
  data: z
    .object({
      user: z
        .object({
          pinnedItems: z.object({
            nodes: z.array(z.object({ name: z.string().optional() }).nullable()),
          }),
          contributionsCollection: z
            .object({ contributionCalendar: z.object({ totalContributions: z.number() }) })
            .nullable()
            .optional(),
        })
        .nullable(),
    })
    .nullable()
    .optional(),
});
