import type { ReadmeInsight } from "@/types/github";

/** Opening lines of well-known starter READMEs nobody edited. */
const TEMPLATES: [RegExp, string][] = [
  [/getting started with create react app/i, "Create React App"],
  [/this template provides a minimal setup to get react working in vite/i, "Vite + React"],
  [/^#\s*react \+ (typescript \+ )?vite/im, "Vite + React"],
  [/^#\s*vue 3 \+ (typescript \+ )?vite/im, "Vite + Vue"],
  [/this is a \[next\.js\]\(https:\/\/nextjs\.org\) project bootstrapped with/i, "create-next-app"],
  [/this project was generated with \[angular cli\]/i, "Angular CLI"],
  [/^#\s*sv\b|everything you need to build a svelte project/im, "SvelteKit"],
  [/welcome to your new ts\.?ed|this project was bootstrapped with fastify-cli/i, "framework CLI"],
  [/a progressive \[node\.js\]\(http:\/\/nodejs\.org\) framework for building efficient/i, "NestJS"],
  [/^#\s*laravel\b[\s\S]{0,200}laravel is a web application framework/im, "Laravel"],
  [/^#\s*expo app|this is an \[expo\]\(https:\/\/expo\.dev\) project created with/i, "Expo"],
];

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`>#|-]{1,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeReadme(repo: string, md: string | null): ReadmeInsight {
  if (md === null || !md.trim()) {
    return { repo, missing: true, words: 0, headings: 0, codeBlocks: 0, images: 0, badges: 0, hasInstall: false, hasUsage: false, template: null, excerpt: "" };
  }
  const prose = stripMarkdown(md);
  const template = TEMPLATES.find(([re]) => re.test(md))?.[1] ?? null;
  return {
    repo,
    missing: false,
    words: prose ? prose.split(/\s+/).length : 0,
    headings: (md.match(/^#{1,6}\s+\S/gm) || []).length,
    codeBlocks: Math.floor((md.match(/```/g) || []).length / 2),
    images: (md.match(/!\[[^\]]*\]\([^)]*\)|<img\s/gi) || []).length,
    badges: (md.match(/shields\.io|badge\.svg|\/badges?\//gi) || []).length,
    hasInstall: /^#+.*\b(install|installation|setup|getting started|quick ?start)\b/im.test(md),
    hasUsage: /^#+.*\b(usage|how to use|examples?|features)\b/im.test(md),
    template,
    excerpt: prose.slice(0, 300),
  };
}
