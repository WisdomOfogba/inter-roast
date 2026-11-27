import type { Indicator, Intensity, PreparedSubmission, RoastResult } from "@/types/roast";
import { clampScore, SCORE_BANDS } from "@/lib/validation/roast-output";
import { analyze, topHit, type Signals, type TopicId } from "./analyze";
import { rankArchetypes, type Ctx } from "./archetypes";

/**
 * The deterministic, rules-based roast engine. It runs entirely locally, needs
 * no API key, and only states things that are traceable to the submission.
 * Same input + intensity => same roast (seeded), different inputs => varied.
 */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const TOPIC_JABS: Record<TopicId, Record<Intensity, string[]>> = {
  tech: {
    playful: ["You talk about tech the way some people talk about their kids, including the part where you won't stop showing photos."],
    brutal: ["Your relationship with tech is the most stable one you've posted about."],
    savage: ["You've spent more time customising your setup than using it for anything a human would call output."],
  },
  finance: {
    playful: ["You bring up money like it's a personality trait, and to be fair, it's a diversified one."],
    brutal: ["You talk about the market like you're on a first-name basis with it. The market has not saved your number."],
    savage: ["You've got a five-year financial plan and a fifteen-minute attention span, and only one of them is showing up in your posts."],
  },
  relationships: {
    playful: ["Your posts about relationships read like a romcom where the writers keep adding complications."],
    brutal: ["You discuss relationships with the confidence of a TV judge and the track record of a reality-show contestant."],
    savage: ["Your love life has more plot twists than your posts have paragraph breaks, and neither is resolving soon."],
  },
  gaming: {
    playful: ["You talk about games with the passion of someone who has a backlog bigger than their to-do list."],
    brutal: ["You've got elite reaction times and the patch-note knowledge of a scholar, which is great news for exactly nobody at brunch."],
    savage: ["You'd grind 80 hours for a cosmetic item and still can't grind out a reply to your group chat."],
  },
  entertainment: {
    playful: ["Your takes on movies and TV come with the energy of someone who's been waiting all week to explain the ending."],
    brutal: ["You review shows like a critic with a deadline, except nobody commissioned you and the deadline is self-imposed."],
    savage: ["You've rewatched things so often that your personality is mostly reruns."],
  },
  fitness: {
    playful: ["You mention the gym the way other people mention the weather: frequently, and as an opener."],
    brutal: ["You count macros with precision and count social cues not at all."],
    savage: ["Your gains are real. So is the fact that every conversation you have eventually becomes about them."],
  },
  food: {
    playful: ["You talk about food with the reverence usually reserved for religious texts and grandmothers."],
    brutal: ["You have more opinions about coffee than most people have about their careers."],
    savage: ["You're one sourdough starter away from naming it, and the starter has a better social life than you."],
  },
  pets: {
    playful: ["Your pet clearly runs the account; you're just the opposable thumbs."],
    brutal: ["You bring up your pet the way some people bring up their degree: constantly and unprompted."],
    savage: ["Your pet is the most interesting thing in your posts, and the pet didn't consent to the content strategy."],
  },
  work: {
    playful: ["You talk about work like it's a long-running sitcom you're contractually obligated to star in."],
    brutal: ["You complain about meetings in posts long enough to have been a meeting."],
    savage: ["You've written more about your job online than you've written for your job."],
  },
  books: {
    playful: ["You talk about books like the to-read pile isn't quietly becoming a load-bearing wall."],
    brutal: ["You mention reading often enough that it's starting to feel like a credential."],
    savage: ["Your reading list is impressive. Your reading pace is a rumour."],
  },
  cars: {
    playful: ["You talk about cars with the tender patience of someone explaining their dog's personality."],
    brutal: ["You've got opinions about transmissions that nobody at the party asked for, and the party is now smaller."],
    savage: ["You could rebuild an engine blindfolded and still can't park a conversation."],
  },
  home: {
    playful: ["You discuss your home and plants with the pride of someone who has kept a monstera alive against all odds."],
    brutal: ["Your houseplants get better care and more attention than any of your replies."],
    savage: ["Your plants are thriving, which is more than we can say for your posting schedule."],
  },
};

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length) % arr.length];
}

function level(value: number, steps: [number, number, number, number]): number {
  let l = 1;
  for (const s of steps) if (value >= s) l++;
  return Math.min(5, l);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

interface Evidence {
  weight: number;
  text: Record<Intensity, string>;
}

/** Observations built only from counted facts in the submission. */
function collectEvidence(s: Signals): Evidence[] {
  const ev: Evidence[] = [];
  const items = s.itemCount || 1;
  const unit = s.itemCount > 1 ? plural(s.itemCount, "post") : "what you gave us";

  const argueHits = Object.entries(s.markers.argue.hits).sort((a, b) => b[1] - a[1]);
  if (s.markers.argue.count >= 3) {
    const n = s.markers.argue.count;
    const list = argueHits.slice(0, 3).map(([p]) => `"${p}"`).join(", ");
    ev.push({
      weight: n * 2,
      text: {
        playful: `${plural(n, "correction phrase")} in ${unit}, including ${list}. A gentle pedant, but a pedant.`,
        brutal: `${plural(n, "correction phrase")} in ${unit}: ${list}. That's not a word choice, it's a warning label.`,
        savage: `${list}: ${plural(n, "correction phrase")} in ${unit}. Every one was a choice. Most were unprovoked.`,
      },
    });
  } else if (argueHits.length && argueHits[0][1] >= 2) {
    const [phrase, count] = argueHits[0];
    ev.push({
      weight: count * 2,
      text: {
        playful: `"${phrase}" shows up ${plural(count, "time")} in ${unit}. It's a verbal tic now.`,
        brutal: `You used "${phrase}" ${plural(count, "time")} in ${unit}. Bold of you.`,
        savage: `"${phrase}", ${plural(count, "time")}, in ${unit}. Nobody asked once.`,
      },
    });
  }

  const advice = topHit(s, "advice");
  if (advice && s.markers.advice.count >= 2) {
    ev.push({
      weight: s.markers.advice.count * 1.8,
      text: {
        playful: `${plural(s.markers.advice.count, "piece")} of unsolicited advice detected. Including "${advice.phrase}". Very wholesome. Very unprompted.`,
        brutal: `You dropped ${plural(s.markers.advice.count, "advice phrase")} like "${advice.phrase}". Nobody booked a session.`,
        savage: `${plural(s.markers.advice.count, "dose")} of advice like "${advice.phrase}", all free, all unlicensed, all ignored.`,
      },
    });
  }

  if (s.avgWordsPerItem >= 70 && s.itemCount >= 2) {
    ev.push({
      weight: s.avgWordsPerItem / 20,
      text: {
        playful: `Your average post runs about ${s.avgWordsPerItem} words. Short-form content is clearly not your genre.`,
        brutal: `Average post length: ~${s.avgWordsPerItem} words. That's not a comment, that's a cover letter.`,
        savage: `~${s.avgWordsPerItem} words per post on average. Somewhere an editor felt a chill and didn't know why.`,
      },
    });
  } else if (s.itemCount >= 3 && s.avgWordsPerItem <= 12) {
    ev.push({
      weight: 3,
      text: {
        playful: `Your posts average ~${s.avgWordsPerItem} words. Efficient. Cryptic. A little haiku-coded.`,
        brutal: `~${s.avgWordsPerItem} words per post. You comment like you're paying per letter.`,
        savage: `~${s.avgWordsPerItem} words per post. That's not brevity, that's a hostage note.`,
      },
    });
  }

  if (s.questionMarks >= Math.max(3, items)) {
    ev.push({
      weight: s.questionMarks / 1.5,
      text: {
        playful: `${plural(s.questionMarks, "question mark")} across ${unit}. Curious mind, or just never sure?`,
        brutal: `${plural(s.questionMarks, "question mark")}. You don't post, you file inquiries.`,
        savage: `${plural(s.questionMarks, "question mark")}. Even your statements sound like they're asking permission.`,
      },
    });
  }

  if (s.exclamations >= Math.max(3, items)) {
    ev.push({
      weight: s.exclamations / 1.5,
      text: {
        playful: `${plural(s.exclamations, "exclamation mark")}! Your energy is infectious! Please calm down!`,
        brutal: `${plural(s.exclamations, "exclamation mark")}. You type like a smoke alarm.`,
        savage: `${plural(s.exclamations, "exclamation mark")}. Your keyboard has filed a noise complaint.`,
      },
    });
  }

  if (s.shoutedWords >= 3) {
    ev.push({
      weight: s.shoutedWords,
      text: {
        playful: `${plural(s.shoutedWords, "word")} in ALL CAPS. We heard you the first time.`,
        brutal: `${plural(s.shoutedWords, "word")} in full caps. Indoor voice, please.`,
        savage: `${plural(s.shoutedWords, "WORD")} IN CAPS. Volume is not an argument.`,
      },
    });
  }

  if (s.subreddits.length >= 1) {
    const list = s.subreddits.slice(0, 3).join(", ");
    ev.push({
      weight: 2 + s.subreddits.length,
      text: {
        playful: `Name-dropped ${list}. A well-curated internet neighbourhood.`,
        brutal: `You mentioned ${list}. That's not a feed, that's a personality kit.`,
        savage: `${list}. Show us your subreddits and we'll show you your therapist's notes.`,
      },
    });
  }

  if (s.contradictions.length) {
    const c = s.contradictions[0];
    ev.push({
      weight: 6,
      text: {
        playful: `Gently noting that you ${c}.`,
        brutal: `Exhibit A: you ${c}.`,
        savage: `You ${c}. The prosecution rests.`,
      },
    });
  }

  const hedge = topHit(s, "hedge");
  const hedgeAlreadyUsed = hedge && s.contradictions.some((c) => c.toLowerCase().includes(hedge.phrase.replace(/^im /, "i'm ")));
  if (hedge && !hedgeAlreadyUsed) {
    ev.push({
      weight: 3 + hedge.count,
      text: {
        playful: `Opened with "${hedge.phrase}". Bold disclaimer energy.`,
        brutal: `"${hedge.phrase}" is doing a lot of heavy lifting in your posts.`,
        savage: `"${hedge.phrase}". Nothing good has ever followed those words.`,
      },
    });
  }

  if (s.firstPersonRatio > 0.08 && s.wordCount > 60) {
    ev.push({
      weight: s.firstPersonRatio * 40,
      text: {
        playful: `About ${Math.round(s.firstPersonRatio * 100)}% of your words are "I", "me" or "my". Self-aware, literally.`,
        brutal: `Roughly ${Math.round(s.firstPersonRatio * 100)}% of your words are about you. The rest are about you, indirectly.`,
        savage: `${Math.round(s.firstPersonRatio * 100)}% of everything you wrote is "I", "me" or "my". A memoir nobody pre-ordered.`,
      },
    });
  }

  if (s.emojiCount >= 4) {
    ev.push({
      weight: s.emojiCount / 2,
      text: {
        playful: `${plural(s.emojiCount, "emoji")}. Your posts are basically illustrated.`,
        brutal: `${plural(s.emojiCount, "emoji")}. You don't write, you decorate.`,
        savage: `${plural(s.emojiCount, "emoji")}. Words were available. You declined them.`,
      },
    });
  }

  const online = topHit(s, "online");
  if (online && s.markers.online.count >= 3) {
    ev.push({
      weight: s.markers.online.count,
      text: {
        playful: `"${online.phrase}" appears ${plural(online.count, "time")}. You speak fluent internet.`,
        brutal: `${plural(s.markers.online.count, "unit")} of internet slang, led by "${online.phrase}". Grass misses you.`,
        savage: `"${online.phrase}" ${plural(online.count, "time")}. Your vocabulary has been replaced by a comment section.`,
      },
    });
  }

  return ev.sort((a, b) => b.weight - a.weight);
}

function sparseObservations(s: Signals): Evidence[] {
  return [
    {
      weight: 1,
      text: {
        playful: `You gave us ${plural(s.wordCount, "word")}. We've seen longer grocery lists.`,
        brutal: `${plural(s.wordCount, "word")} total. That's not a digital footprint, that's a smudge.`,
        savage: `${plural(s.wordCount, "word")}. We've roasted parking tickets with more personality.`,
      },
    },
    {
      weight: 1,
      text: {
        playful: "Receipts were thin, so everything here should be taken with a large pinch of salt.",
        brutal: "Insufficient evidence for a full conviction. This is a warning.",
        savage: "With this little to go on, we had to roast the silence. The silence did not defend you.",
      },
    },
    {
      weight: 1,
      text: {
        playful: "Paste a few more posts or comments for a roast that really knows you.",
        brutal: "Come back with real receipts and we'll do this properly.",
        savage: "Bring more receipts next time. You clearly have them. You're just hiding them.",
      },
    },
  ];
}

function buildIndicators(s: Signals, archetypeId: string): Indicator[] {
  const all: (Indicator & { w: number })[] = [
    { label: "Well-actually rate", level: level(s.markers.argue.count, [1, 3, 5, 8]), w: s.markers.argue.count },
    { label: "Unsolicited advice", level: level(s.markers.advice.count, [1, 2, 4, 7]), w: s.markers.advice.count },
    { label: "Doubt loops", level: level(s.markers.overthink.count, [1, 3, 5, 8]), w: s.markers.overthink.count },
    { label: "Internet slang", level: level(s.markers.online.count, [1, 3, 6, 10]), w: s.markers.online.count },
    { label: "Self-reference", level: level(s.firstPersonRatio * 100, [3, 6, 9, 12]), w: s.firstPersonRatio * 50 },
    { label: "Post length", level: level(s.avgWordsPerItem, [20, 45, 80, 130]), w: s.avgWordsPerItem / 25 },
    { label: "Hedging", level: level(s.markers.hedge.count + s.contradictions.length, [1, 2, 3, 5]), w: s.markers.hedge.count + s.contradictions.length },
    { label: "Volume (caps & !)", level: level(s.shoutedWords + s.exclamations, [2, 5, 9, 14]), w: (s.shoutedWords + s.exclamations) / 2 },
    { label: "System building", level: level(s.markers.productivity.count, [1, 2, 4, 7]), w: s.markers.productivity.count },
    { label: "Investigation", level: level(s.markers.detective.count, [1, 2, 4, 7]), w: s.markers.detective.count },
    { label: "Deep thoughts", level: level(s.markers.philosophy.count, [1, 2, 4, 7]), w: s.markers.philosophy.count },
    { label: "Posting presence", level: level(s.wordCount, [30, 120, 400, 900]), w: archetypeId === "lurker" ? 99 : 0 },
  ];
  return all
    .sort((a, b) => b.w - a.w)
    .slice(0, 3)
    .map(({ label, level }) => ({ label, level }));
}

export function generateLocalRoast(sub: PreparedSubmission, intensity: Intensity): RoastResult {
  const s = analyze(sub);
  const seedSource = [sub.bio, ...sub.items, intensity].join("|");
  const r = rng(hash(seedSource));

  const ranked = rankArchetypes(s);
  const primary = s.sparse ? ranked.find((x) => x.archetype.id === "lurker")! : ranked[0];
  const secondary = ranked.find((x) => x.archetype.id !== primary.archetype.id && x.score > 0.5);
  const a = primary.archetype;

  const ctx: Ctx = {
    topic: s.topics[0]?.label ?? null,
    topic2: s.topics[1]?.label ?? null,
    sub: s.subreddits[0] ?? null,
  };

  // --- main roast: opener + topic jab + receipt + kicker ---
  const parts: string[] = [];
  parts.push(pick(a.openers[intensity], r)(ctx));
  if (s.topics[0] && !s.sparse) parts.push(pick(TOPIC_JABS[s.topics[0].id][intensity], r));
  if (s.receipt && !s.sparse) {
    const lead =
      intensity === "playful" ? "Case in point, you wrote:" : intensity === "brutal" ? "Exhibit A, in your own words:" : "And we quote, because you did this to yourself:";
    parts.push(`${lead} "${s.receipt}"`);
  }
  if (secondary && !s.sparse && secondary.score > primary.score * 0.6) {
    parts.push(`There are also strong notes of ${secondary.archetype.title.replace(/^The /, "")}, which is not the flex you think it is.`);
  }
  parts.push(pick(a.kickers[intensity], r)(ctx));
  let mainRoast = parts.join(" ");
  if (mainRoast.length > 880) mainRoast = mainRoast.slice(0, 877).replace(/\s+\S*$/, "") + "…";

  // --- observations ---
  const evidence = s.sparse ? sparseObservations(s) : collectEvidence(s);
  const obs = evidence.slice(0, 3).map((e) => e.text[intensity]);
  const fillers = [
    s.topics[0]
      ? `Most-mentioned subject: ${s.topics[0].label} (led by "${s.topics[0].topWord}"). Noted. Judged.`
      : `${plural(s.itemCount, "post")} submitted and no dominant topic. Even your interests can't commit.`,
    s.topics[1]
      ? `Runner-up obsession: ${s.topics[1].label}. A balanced diet of things nobody asked about.`
      : `You wrote ${plural(s.wordCount, "word")} in total. Every one of them was evidence.`,
    s.receipt ? `The line that gave you away: "${s.receipt.slice(0, 110)}"` : "Your receipts were short. Your crimes, however, were clear.",
  ];
  for (const f of fillers) if (obs.length < 3) obs.push(f);

  // --- traits ---
  const traits = [...a.traits];
  if (s.topics[0]) traits.unshift(`${s.topics[0].label[0].toUpperCase()}${s.topics[0].label.slice(1)} brain`);
  const personalityTraits = traits.filter((t) => t.length <= 28).slice(0, 4);

  // --- score: band by intensity, nudged by how much material there was ---
  const [lo, hi] = SCORE_BANDS[intensity];
  const strength = Math.min(1, (primary.score / 10) * 0.6 + (s.sparse ? 0 : 0.3) + r() * 0.2);
  const roastScore = clampScore(lo + (hi - lo) * strength, intensity);

  const behaviourClass = s.topics[0] && !s.sparse
    ? `${a.behaviourClass} (${s.topics[0].label})`.slice(0, 70)
    : a.behaviourClass;

  return {
    personalityTitle: a.title,
    personalityDescription: pick(a.descriptions, r)(ctx),
    headline: pick(a.headlines, r),
    mainRoast,
    observations: [obs[0], obs[1], obs[2]],
    personalityTraits,
    behaviourClass,
    indicators: buildIndicators(s, a.id),
    roastScore,
    roastIntensity: intensity,
    closingStatement: pick(a.closers[intensity], r),
  };
}
