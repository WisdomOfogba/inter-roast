/**
 * Reddit usernames are 3–20 characters of letters, digits, "_" and "-".
 * We accept the bare name, "u/name", "/u/name", "@name" and profile URLs on
 * reddit.com subdomains (www, old, new, np, m) under /user/ or /u/.
 */
const USERNAME = /^[A-Za-z0-9_-]{3,20}$/;
const REDDIT_HOST = /^(?:(?:www|old|new|np|m|sh)\.)?reddit\.com$/i;

export type HandleParseResult =
  | { ok: true; handle: string }
  | { ok: false; error: string };

export function parseRedditHandle(raw: string): HandleParseResult {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Enter a Reddit username or profile URL." };
  if (input.length > 200) return { ok: false, error: "That's not a username, that's an essay." };

  let candidate = input;

  const looksLikeUrl = /^(https?:\/\/)?([a-z0-9-]+\.)*reddit\.com\//i.test(input);
  if (looksLikeUrl) {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    } catch {
      return { ok: false, error: "That URL doesn't parse. Try just the username." };
    }
    if (!REDDIT_HOST.test(url.hostname)) {
      return { ok: false, error: "That's not a reddit.com profile link." };
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2 || !["user", "u"].includes(parts[0].toLowerCase())) {
      return { ok: false, error: "Use a profile link like reddit.com/user/yourname." };
    }
    candidate = parts[1];
  } else if (/^https?:\/\//i.test(input) || /\.[a-z]{2,}\//i.test(input)) {
    return { ok: false, error: "That's not a reddit.com profile link." };
  } else {
    candidate = input.replace(/^\/?u\//i, "").replace(/^@/, "");
  }

  candidate = candidate.replace(/\/+$/, "");
  if (!USERNAME.test(candidate)) {
    return {
      ok: false,
      error: "Reddit usernames are 3–20 letters, numbers, dashes or underscores.",
    };
  }
  return { ok: true, handle: candidate };
}
