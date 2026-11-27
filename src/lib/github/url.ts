/**
 * Turn whatever the user pasted into a GitHub username, or explain why not.
 * Accepts github.com/<user> (with or without scheme/www/trailing path), and
 * bare "username" / "@username" for convenience.
 *
 * GitHub usernames: 1–39 chars, alphanumeric or single hyphens, cannot start
 * or end with a hyphen.
 */
const USERNAME = /^(?!-)(?!.*--)[A-Za-z0-9-]{1,39}(?<!-)$/;

/** First path segments on github.com that are product pages, not people. */
const RESERVED = new Set([
  "about", "account", "apps", "blog", "codespaces", "collections", "contact", "customer-stories",
  "dashboard", "enterprise", "events", "explore", "features", "issues", "login", "logout",
  "marketplace", "new", "notifications", "orgs", "organizations", "pricing", "pulls", "readme",
  "search", "security", "settings", "signup", "site", "sponsors", "stars", "team", "topics",
  "trending", "users", "watching", "join", "sessions", "copilot", "solutions", "resources",
]);

export type ParsedProfile = { ok: true; username: string } | { ok: false; error: string };

export function parseGitHubProfile(raw: string): ParsedProfile {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Paste a GitHub profile link, like github.com/your-username." };
  if (input.length > 200) return { ok: false, error: "That link is too long to be a GitHub profile." };

  let candidate: string;
  const looksLikeUrl = /^(https?:\/\/)?(www\.)?github\.com(\/|$)/i.test(input);

  if (looksLikeUrl) {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    } catch {
      return { ok: false, error: "That link doesn't parse. Try github.com/your-username." };
    }
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
      return { ok: false, error: "Only github.com profile links work here." };
    }
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return { ok: false, error: "Add the username after github.com/." };
    candidate = segments[0];
    if (RESERVED.has(candidate.toLowerCase())) {
      return { ok: false, error: `github.com/${candidate} is a GitHub page, not a profile.` };
    }
  } else if (/^https?:\/\//i.test(input) || /\.[a-z]{2,}(\/|$)/i.test(input)) {
    return { ok: false, error: "Only github.com profile links work here." };
  } else {
    candidate = input.replace(/^@/, "");
  }

  if (!USERNAME.test(candidate)) {
    return { ok: false, error: "That isn't a valid GitHub username (letters, numbers and single hyphens, up to 39 characters)." };
  }
  return { ok: true, username: candidate };
}
