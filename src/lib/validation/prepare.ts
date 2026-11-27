import type { PreparedSubmission } from "@/types/roast";

/** Hard ceiling on what we ever forward to a model, after dedupe. */
export const MAX_FORWARDED_CHARS = 6000;
const MAX_ITEM_CHARS = 1200;
const MAX_ITEMS = 40;
const SPARSE_WORDS = 45;

/** Strip control & zero-width characters, normalise whitespace. */
export function cleanText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Split pasted receipts into individual posts/comments. Users separate them
 * with blank lines or "---"; failing that, every non-empty line is an item.
 */
export function splitItems(content: string): string[] {
  const text = cleanText(content);
  if (!text) return [];
  const bySeparator = text
    .split(/\n\s*(?:-{3,}|={3,}|\*{3,})\s*\n|\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const items = bySeparator.length > 1 ? bySeparator : text.split("\n").map((s) => s.trim()).filter(Boolean);
  return items.map((s) => s.replace(/\n{2,}/g, "\n"));
}

const dedupeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function countWords(s: string): number {
  const m = s.match(/[\p{L}\p{N}'’]+/gu);
  return m ? m.length : 0;
}

export function prepareSubmission(input: {
  handle: string | null;
  bio: string;
  content: string;
  context: string;
}): PreparedSubmission {
  const bio = cleanText(input.bio).slice(0, 400);
  const context = cleanText(input.context).slice(0, 300);

  const seen = new Set<string>();
  let duplicatesRemoved = 0;
  let truncated = false;
  const items: string[] = [];
  let budget = MAX_FORWARDED_CHARS - bio.length - context.length;

  for (const raw of splitItems(input.content)) {
    const key = dedupeKey(raw);
    if (!key) continue;
    if (seen.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(key);
    let item = raw;
    if (item.length > MAX_ITEM_CHARS) {
      item = item.slice(0, MAX_ITEM_CHARS).trimEnd() + "…";
      truncated = true;
    }
    if (items.length >= MAX_ITEMS || budget - item.length < 0) {
      truncated = true;
      break;
    }
    budget -= item.length;
    items.push(item);
  }

  const allText = [bio, ...items].join(" ");
  const wordCount = countWords(allText);

  return {
    handle: input.handle,
    bio,
    items,
    context,
    stats: {
      itemCount: items.length,
      wordCount,
      charCount: allText.length,
      duplicatesRemoved,
      truncated,
      sparse: wordCount < SPARSE_WORDS,
    },
  };
}
