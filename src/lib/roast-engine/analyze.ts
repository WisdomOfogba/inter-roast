import type { PreparedSubmission } from "@/types/roast";
import { countWords } from "@/lib/validation/prepare";

/**
 * Turns a prepared submission into countable, *real* signals. Everything the
 * local engine says about a person must trace back to something in here.
 */

export type MarkerGroup =
  | "argue"
  | "advice"
  | "overthink"
  | "online"
  | "detective"
  | "productivity"
  | "mainCharacter"
  | "lurker"
  | "philosophy"
  | "hedge";

export const MARKERS: Record<MarkerGroup, string[]> = {
  argue: [
    "actually", "technically", "source?", "citation needed", "you're wrong", "youre wrong",
    "that's wrong", "incorrect", "strawman", "straw man", "fallacy", "disagree", "objectively",
    "factually", "wrong", "debate", "prove it", "not true", "misinformation", "pedantic", "correction",
  ],
  advice: [
    "you should", "have you tried", "i'd recommend", "i would recommend", "i recommend",
    "communicate", "boundaries", "red flag", "therapy", "therapist", "you deserve", "valid",
    "self-care", "talk to them", "talk to him", "talk to her", "my advice", "op,", "nta", "yta",
    "sending hugs", "you got this", "proud of you",
  ],
  overthink: [
    "what if", "maybe", "i wonder", "overthink", "overthinking", "not sure", "i guess",
    "possibly", "on the other hand", "although", "second-guess", "second guess", "can't decide",
    "torn between", "pros and cons", "spiral", "anxious about", "keep thinking",
  ],
  online: [
    "lol", "lmao", "lmfao", "ngl", "tbh", "fr", "based", "ratio", "touch grass", "chronically online",
    "terminally online", "doomscroll", "3am", "4am", "upvote", "downvote", "karma", "this sub",
    "meme", "discord", "twitter", "tiktok", "reddit", "irl", "copium", "cope", "w ", "mid",
  ],
  detective: [
    "according to", "i looked into", "turns out", "found it", "archive", "reverse image",
    "proof", "evidence", "investigate", "receipts", "timeline", "screenshot", "sauce", "source:",
    "cross-reference", "deleted comment", "post history", "digging",
  ],
  productivity: [
    "productivity", "productive", "notion", "obsidian", "routine", "5am", "habit", "habits", "grind",
    "hustle", "goals", "to-do", "todo", "pomodoro", "deep work", "atomic habits", "planner",
    "workflow", "optimize", "optimise", "time blocking", "second brain", "procrastinat",
  ],
  mainCharacter: [
    "edit:", "update:", "aita", "tifu", "story time", "storytime", "so this happened",
    "my life", "literally", "everyone was", "everyone stared", "thanks for the gold", "blew up",
    "i'm the type", "i'm just built different", "nobody understands",
  ],
  lurker: ["lurker", "long time lurker", "first post", "never post", "throwaway", "first time posting", "rarely comment"],
  philosophy: [
    "meaning", "consciousness", "existence", "society", "humanity", "reality", "fundamentally",
    "the universe", "simulation", "free will", "perspective", "nietzsche", "stoic", "stoicism",
    "existential", "the human condition", "paradox", "in a way, we", "what is",
  ],
  hedge: [
    "i'm not saying", "im not saying", "no offense", "not to be that guy", "unpopular opinion",
    "hot take", "just my opinion", "don't come at me", "dont come at me", "i could be wrong",
    "correct me if", "i don't care but", "i dont care but", "not that i care", "just saying",
  ],
};

export type TopicId =
  | "tech" | "finance" | "relationships" | "gaming" | "entertainment" | "fitness" | "food"
  | "pets" | "work" | "books" | "cars" | "home";

export const TOPICS: Record<TopicId, { label: string; words: string[] }> = {
  tech: {
    label: "tech",
    words: ["python", "javascript", "typescript", "linux", "arch", "vim", "neovim", "rust", "gpu", "apple",
      "android", "iphone", "windows", "macbook", "code", "coding", "framework", "react", "keyboard",
      "mechanical keyboard", "pc build", "homelab", "server", "docker", "kubernetes", "ai", "chatgpt", "llm",
      "programming", "developer", "bug", "deploy", "terminal", "nvidia", "laptop", "app"],
  },
  finance: {
    label: "money",
    words: ["stock", "stocks", "crypto", "bitcoin", "btc", "eth", "etf", "index fund", "roth", "ira", "401k",
      "budget", "invest", "investing", "portfolio", "dividend", "fire", "mortgage", "salary", "savings",
      "debt", "credit score", "credit card", "tax", "taxes", "vtsax", "s&p", "market", "hodl", "options", "calls", "puts"],
  },
  relationships: {
    label: "relationships",
    words: ["girlfriend", "boyfriend", "partner", "dating", "my ex", "tinder", "hinge", "bumble", "crush",
      "texted", "texting", "situationship", "marriage", "wife", "husband", "first date", "date", "breakup",
      "broke up", "ghosted", "left on read", "relationship", "talking stage", "anniversary"],
  },
  gaming: {
    label: "gaming",
    words: ["game", "games", "gaming", "steam", "elden ring", "ps5", "xbox", "nintendo", "switch", "ranked",
      "fps", "mmo", "minecraft", "league", "valorant", "fortnite", "baldur", "zelda", "speedrun", "backlog",
      "controller", "patch notes", "nerf", "buff", "grinding", "boss fight"],
  },
  entertainment: {
    label: "movies & TV",
    words: ["movie", "movies", "show", "series", "season", "episode", "netflix", "anime", "marvel",
      "star wars", "album", "song", "spotify", "film", "actor", "finale", "trailer", "director", "sequel",
      "rewatch", "binge", "plot", "character arc", "taylor swift", "concert", "playlist"],
  },
  fitness: {
    label: "fitness",
    words: ["gym", "lift", "lifting", "bench", "squat", "deadlift", "protein", "gains", "marathon", "cardio",
      "bulk", "bulking", "cut", "cutting", "macros", "creatine", "pr", "leg day", "5k", "running", "workout", "reps"],
  },
  food: {
    label: "food",
    words: ["recipe", "cook", "cooking", "coffee", "espresso", "pizza", "sourdough", "air fryer", "ramen",
      "restaurant", "baking", "meal prep", "brunch", "matcha", "hot sauce", "barbecue", "bbq", "grill"],
  },
  pets: {
    label: "pets",
    words: ["my cat", "my dog", "cat", "dog", "puppy", "kitten", "pupper", "doggo", "vet", "adopted", "litter box"],
  },
  work: {
    label: "work",
    words: ["boss", "my job", "interview", "manager", "coworker", "co-worker", "resume", "remote work",
      "office", "layoff", "laid off", "promotion", "standup", "meeting", "meetings", "linkedin", "hr", "salary negotiation", "career"],
  },
  books: {
    label: "books",
    words: ["book", "books", "reading list", "novel", "kindle", "goodreads", "author", "chapter", "audiobook", "tbr"],
  },
  cars: {
    label: "cars",
    words: ["car", "cars", "engine", "manual transmission", "stick shift", "ev", "tesla", "miata", "horsepower", "turbo", "mpg", "dealership"],
  },
  home: {
    label: "home & DIY",
    words: ["plants", "houseplant", "monstera", "ikea", "diy", "apartment", "landlord", "renovation", "garden", "roommate"],
  },
};

export interface Signals {
  itemCount: number;
  wordCount: number;
  avgWordsPerItem: number;
  longestItemWords: number;
  questionMarks: number;
  exclamations: number;
  shoutedWords: number;
  ellipses: number;
  firstPerson: number;
  firstPersonRatio: number;
  markers: Record<MarkerGroup, { count: number; hits: Record<string, number> }>;
  topics: { id: TopicId; label: string; count: number; topWord: string }[];
  subreddits: string[];
  /** A short, quotable sentence from the submission (verbatim). */
  receipt: string | null;
  contradictions: string[];
  sparse: boolean;
  hasBio: boolean;
  emojiCount: number;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function countPhrase(haystack: string, phrase: string): number {
  // word-ish boundaries for phrases starting/ending with letters
  const start = /^[a-z0-9]/i.test(phrase) ? "(?<![a-z0-9])" : "";
  const end = /[a-z0-9]$/i.test(phrase) ? "(?![a-z0-9])" : "";
  const re = new RegExp(start + escapeRe(phrase) + end, "gi");
  return (haystack.match(re) || []).length;
}

function pickReceipt(items: string[], bio: string): string | null {
  const sentences = [...items, bio]
    .flatMap((t) => t.split(/(?<=[.!?])\s+|\n/))
    .map((s) => s.trim().replace(/^["'“”]+|["'“”]+$/g, ""))
    .filter((s) => s.length >= 24 && s.length <= 120 && !/https?:\/\//i.test(s));
  if (!sentences.length) return null;
  const allMarkers = Object.values(MARKERS).flat();
  let best = sentences[0];
  let bestScore = -1;
  for (const s of sentences) {
    const lower = s.toLowerCase();
    let score = 0;
    for (const m of allMarkers) if (lower.includes(m)) score += 2;
    if (/[!?]/.test(s)) score += 1;
    if (/\b(i|i'm|my|me)\b/i.test(s)) score += 1;
    score -= Math.abs(70 - s.length) / 40; // prefer ~70 chars
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

export function analyze(sub: PreparedSubmission): Signals {
  const items = sub.items;
  const corpus = [sub.bio, ...items].join("\n");
  const lower = corpus.toLowerCase();
  const wordCount = countWords(corpus);
  const itemWordCounts = items.map(countWords);
  const itemCount = items.length;

  const markers = {} as Signals["markers"];
  for (const group of Object.keys(MARKERS) as MarkerGroup[]) {
    const hits: Record<string, number> = {};
    let count = 0;
    for (const phrase of MARKERS[group]) {
      const n = countPhrase(lower, phrase);
      if (n) {
        hits[phrase.trim()] = n;
        count += n;
      }
    }
    markers[group] = { count, hits };
  }

  const topics = (Object.keys(TOPICS) as TopicId[])
    .map((id) => {
      let count = 0;
      let topWord = "";
      let topN = 0;
      for (const w of TOPICS[id].words) {
        const n = countPhrase(lower, w);
        count += n;
        if (n > topN) {
          topN = n;
          topWord = w;
        }
      }
      return { id, label: TOPICS[id].label, count, topWord };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const subreddits = Array.from(
    new Set((corpus.match(/(?<![a-z0-9])\/?r\/[A-Za-z0-9_]{2,21}/g) || []).map((s) => s.replace(/^\//, "").toLowerCase())),
  ).slice(0, 5);

  const firstPerson = (lower.match(/\b(i|i'm|im|i've|i'd|me|my|mine|myself)\b/g) || []).length;

  const contradictions: string[] = [];
  const has = (re: RegExp) => re.test(lower);
  if (has(/\b(i don'?t care|not that i care|whatever)\b/) && wordCount > 120)
    contradictions.push("claim not to care, in over a hundred words");
  if (markers.productivity.count >= 2 && has(/procrastinat|putting (it|this) off|haven'?t started|later today/))
    contradictions.push("post about productivity while openly procrastinating");
  if (has(/touch grass|chronically online|terminally online/) && markers.online.count >= 4)
    contradictions.push("tell other people to touch grass from deep inside the comment section");
  if (has(/\b(i'?m|im) not (addicted|obsessed)\b/))
    contradictions.push("are 'not obsessed', per your own unsolicited denial");
  if (markers.hedge.hits["i'm not saying"] || markers.hedge.hits["im not saying"])
    contradictions.push("say 'I'm not saying', then say it anyway");
  if (markers.advice.count >= 2 && topics.some((t) => t.id === "relationships") && has(/\b(my ex|ghosted|single|left on read)\b/))
    contradictions.push("hand out relationship advice with a relationship status that's still loading");
  if (has(/\bhate\b/) && has(/\blove\b/) && itemCount >= 3)
    contradictions.push("hate and love things with equal, exhausting volume");

  return {
    itemCount,
    wordCount,
    avgWordsPerItem: itemCount ? Math.round(itemWordCounts.reduce((a, b) => a + b, 0) / itemCount) : wordCount,
    longestItemWords: itemWordCounts.length ? Math.max(...itemWordCounts) : wordCount,
    questionMarks: (corpus.match(/\?/g) || []).length,
    exclamations: (corpus.match(/!/g) || []).length,
    shoutedWords: (corpus.match(/\b[A-Z]{3,}\b/g) || []).filter((w) => !["LOL", "LMAO", "AITA", "TIFU", "NTA", "YTA", "EDIT", "UPDATE", "TLDR", "USA", "API", "GPU", "CPU"].includes(w)).length,
    ellipses: (corpus.match(/\.{3}|…/g) || []).length,
    firstPerson,
    firstPersonRatio: wordCount ? firstPerson / wordCount : 0,
    markers,
    topics,
    subreddits,
    receipt: pickReceipt(items, sub.bio),
    contradictions,
    sparse: sub.stats.sparse,
    hasBio: sub.bio.length > 0,
    emojiCount: (corpus.match(/\p{Extended_Pictographic}/gu) || []).length,
  };
}

/** The most-used phrase within a marker group, with its count. */
export function topHit(signals: Signals, group: MarkerGroup): { phrase: string; count: number } | null {
  const entries = Object.entries(signals.markers[group].hits).sort((a, b) => b[1] - a[1]);
  return entries.length ? { phrase: entries[0][0], count: entries[0][1] } : null;
}
