/** Public base URL, used for metadata and printed on share cards. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE_NAME = "RepoRiot";
export const TAGLINE = "Your code has receipts.";
export const SOURCE_URL = "https://github.com/WisdomOfogba/inter-roast";
