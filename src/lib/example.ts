import type { RoastRecord } from "@/types/roast";

/**
 * A clearly fictional profile used on the landing page. Not a real account:
 * the UI labels it and renders it without links to github.com.
 */
const day = (n: number) => new Date(Date.UTC(2026, 10, 27) - n * 86_400_000).toISOString();

export const EXAMPLE_NOW = Date.UTC(2026, 10, 27);

export const EXAMPLE_RECORD: RoastRecord = {
  v: 2,
  caseId: "RR-SAMPLE",
  intensity: "spicy",
  profile: {
    login: "example-dev",
    id: 0,
    name: "Sam Example",
    bio: "Building cool stuff",
    followers: 41,
    following: 318,
    publicRepos: 38,
    publicGists: 1,
    createdAt: day(2600),
  },
  result: {
    headline: "Thirty-eight repos, four JavaScript frameworks, one finished README.",
    archetype: "The Framework Sommelier",
    summary: "Changes requested. The ideas are good; the follow-through is in a private repository somewhere.",
    mainRoast:
      "You've rebuilt the same todo app in React, Vue, Svelte and Solid, which isn't a portfolio, it's a framework tasting menu. snippetbox is genuinely good: 412 stars, an install section, the works. Then there's todo-app-final-v2, still wearing the Create React App README it was born in.",
    comments: [
      {
        category: "readme",
        title: "The README was written by create-react-app",
        roast: "todo-app-final-v2 still opens with \"Getting Started with Create React App\". The only documentation is for a tool you stopped using in 2023.",
        evidence: [{ kind: "readme", ref: "todo-app-final-v2" }],
      },
      {
        category: "activity",
        title: "git commit -m \"update\", a modern classic",
        roast: "Your last three commits are \"update\", \"fix\" and \"final fix\". The suspense is killing us, especially since the next one will be \"final fix 2\".",
        evidence: [
          { kind: "commit", ref: "c1" },
          { kind: "commit", ref: "c2" },
          { kind: "fact", ref: "lazy_commits" },
        ],
      },
      {
        category: "stars",
        title: "One repo is carrying the whole team",
        roast: "snippetbox has 412 stars and 26 of your repos have none. It's the group-project member who did all the work while the rest updated the slide deck.",
        evidence: [{ kind: "repo", ref: "snippetbox" }, { kind: "fact", ref: "zero_star_repos" }],
      },
    ],
    closingLine: "Please rebase your ambitions onto main and resolve the conflicts.",
  },
  facts: [
    { id: "lazy_commits", label: "Low-effort commit messages", value: "6 of 8 sampled", definition: "Recent commit messages that are just 'update', 'fix', 'wip' and similar." },
    { id: "zero_star_repos", label: "Repos with no stars", value: "26 of 31", definition: "Listed non-fork repos with 0 stars." },
  ],
  repos: [
    {
      name: "snippetbox", description: "A tiny, fast snippet manager for the terminal", language: "Go", stars: 412, forks: 57, topics: ["cli"],
      isFork: false, archived: false, hasHomepage: false, hasLicense: true, sizeKb: 300, createdAt: day(1500), pushedAt: day(1200),
    },
    {
      name: "todo-app-final-v2", description: "My todo app", language: "JavaScript", stars: 0, forks: 0, topics: [],
      isFork: false, archived: false, hasHomepage: false, hasLicense: false, sizeKb: 900, createdAt: day(40), pushedAt: day(3),
    },
  ],
  readmes: [
    {
      repo: "todo-app-final-v2", missing: false, words: 412, headings: 8, codeBlocks: 0, images: 0, badges: 0, hasInstall: true, hasUsage: false,
      template: "Create React App", excerpt: "Getting Started with Create React App This project was bootstrapped with Create React App.",
    },
  ],
  commits: [
    { id: "c1", repo: "todo-app-final-v2", message: "update", date: day(3) },
    { id: "c2", repo: "todo-app-final-v2", message: "final fix", date: day(4) },
  ],
  languages: [
    { name: "JavaScript", repos: 11 },
    { name: "TypeScript", repos: 8 },
    { name: "Go", repos: 4 },
    { name: "Vue", repos: 3 },
    { name: "Python", repos: 2 },
    { name: "Svelte", repos: 2 },
    { name: "Rust", repos: 1 },
  ],
  pinned: null,
  source: "gemini",
  model: "example",
  createdAt: EXAMPLE_NOW,
};
