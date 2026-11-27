import type { Footprint, RepoSummary } from "@/types/github";
import type { CategoryId, EvidenceRef, Intensity, ReviewComment, RoastResult } from "@/types/roast";
import { isGenericName } from "@/lib/github/normalize";

/**
 * The RepoRiot rules engine: a deterministic roast written only from computed
 * facts and real repo names. Used when Gemini isn't configured or fails, and
 * always labelled as such in the UI.
 */

const DAY = 86_400_000;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
type ByHeat = Record<Intensity, string>;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Candidate {
  category: CategoryId;
  weight: number;
  title: ByHeat;
  roast: ByHeat;
  evidence: EvidenceRef[];
  archetype: string;
  headline: ByHeat;
}

/** One-line versions for the main roast, so it doesn't repeat the comments. */
const MAIN_LINES: Record<string, ByHeat> = {
  "The Serial Starter": { mild: "There's a quiet graveyard of side projects waiting for a sequel.", spicy: "Half the profile is side projects that died of natural causes.", scorched: "The repo list reads like a memorial wall for weekend ideas." },
  "The Undocumented Visionary": { mild: "The READMEs are more vibes than instructions.", spicy: "The READMEs are either missing or still say what the framework CLI wrote for you.", scorched: "Your documentation strategy is 'let the starter template handle it'." },
  "The Framework Sommelier": { mild: "You sample languages like a tasting menu.", spicy: "You switch languages the way other people switch tabs.", scorched: "Every new idea gets a new language and the same unfinished ending." },
  "The Tutorial Completionist": { mild: "Some repo names could use a little more imagination.", spicy: "The repo names sound like folders on a school computer.", scorched: "The naming convention is panic with a hyphen." },
  "The One-Hit Wonder": { mild: "One repo is doing most of the heavy lifting.", spicy: "One repo pays the rent and the rest are roommates.", scorched: "One hit single, followed by a lot of experimental B-sides." },
  "The Underground Artist": { mild: "The star count is still warming up.", spicy: "The star economy here is in a deep recession.", scorched: "Stars are rarer than a passing test suite." },
  "The Cryptic Committer": { mild: "The commit messages keep things mysterious.", spicy: "The commit log is a long list of 'update'.", scorched: "Your git log reads like a ransom note written in one word." },
  "The Quiet Maintainer": { mild: "Public activity has been quiet lately.", spicy: "The activity feed has gone very quiet.", scorched: "The activity feed is a flatline with a profile picture." },
  "The Fork Collector": { mild: "Forks outnumber originals.", spicy: "Most of the profile is other people's code, lovingly bookmarked.", scorched: "You're a curator, not a builder, and the gallery is all borrowed." },
  "The Private Repository": { mild: "There isn't much public code to read yet.", spicy: "There's no public code to roast, which is its own kind of roast.", scorched: "We came for code and found an empty room with the lights on." },
  "The Suspiciously Clean Coder": { mild: "Honestly, it's a tidy profile.", spicy: "It's annoyingly tidy.", scorched: "It's suspiciously clean, like someone hid the evidence." },
};

const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

export function generateEngineRoast(fp: Footprint, intensity: Intensity, now = Date.now()): RoastResult {
  const own = fp.repos.filter((r) => !r.isFork);
  const forks = fp.repos.filter((r) => r.isFork);
  const factIds = new Set(fp.facts.map((f) => f.id));
  const fact = (id: string): EvidenceRef[] => (factIds.has(id) ? [{ kind: "fact", ref: id }] : []);
  const repoRefs = (rs: RepoSummary[], n = 3): EvidenceRef[] => rs.slice(0, n).map((r) => ({ kind: "repo", ref: r.name }));
  const cands: Candidate[] = [];

  // Graveyard
  const stale = own.filter((r) => !r.archived && r.pushedAt && now - Date.parse(r.pushedAt) > 365 * DAY).sort((a, b) => (a.pushedAt ?? "").localeCompare(b.pushedAt ?? ""));
  if (stale.length >= 2 || (stale.length && stale.length / Math.max(own.length, 1) > 0.4)) {
    const names = stale.slice(0, 3).map((r) => r.name);
    const oldest = stale[0];
    const yrs = Math.floor((now - Date.parse(oldest.pushedAt!)) / (365.25 * DAY));
    cands.push({
      category: "graveyard",
      weight: 3 + stale.length / Math.max(own.length, 1) * 6,
      title: { mild: "A few repos are resting peacefully", spicy: "Welcome to the repository graveyard", scorched: "This profile is a cemetery with a README" },
      roast: {
        mild: `${plural(stale.length, "repo")} haven't seen a push in over a year, including ${list(names)}. They're not abandoned, they're just on a very long coffee break.`,
        spicy: `${plural(stale.length, "repo")} untouched for a year or more. ${oldest.name} last heard from you ${plural(yrs, "year")} ago and still thinks you're coming back.`,
        scorched: `${plural(stale.length, "repo")} with no push in over a year. ${list(names)} aren't side projects, they're headstones. ${oldest.name} has been waiting ${plural(yrs, "year")} for a commit that's never coming.`,
      },
      evidence: [...fact("stale_repos"), ...repoRefs(stale)],
      archetype: "The Serial Starter",
      headline: { mild: "Starts strong. Finishes eventually. Maybe.", spicy: "So many repos, so little follow-through.", scorched: "A graveyard of good intentions with a profile picture." },
    });
  }

  // README
  const missing = fp.readmes.filter((r) => r.missing);
  const templates = fp.readmes.filter((r) => r.template);
  const thin = fp.readmes.filter((r) => !r.missing && !r.template && r.words < 40);
  if (missing.length || templates.length || thin.length) {
    const t = templates[0];
    const refs: EvidenceRef[] = [...templates, ...missing, ...thin].slice(0, 3).map((r) => ({ kind: "readme", ref: r.repo }));
    const detail = t
      ? `${t.repo} still has the unedited ${t.template} starter README, so the documentation was written by a CLI.`
      : missing.length
        ? `${list(missing.slice(0, 3).map((r) => r.repo))} ${missing.length === 1 ? "has" : "have"} no README at all.`
        : `${thin[0].repo}'s README is ${plural(thin[0].words, "word")} long. That's not documentation, that's a sticky note.`;
    cands.push({
      category: "readme",
      weight: 3 + missing.length * 1.5 + templates.length * 2 + thin.length,
      title: { mild: "The README could use some love", spicy: "Documentation: left as an exercise for the reader", scorched: "Your READMEs are a treasure map with no treasure" },
      roast: {
        mild: `${detail} A sentence or two about what it does would go a long way.`,
        spicy: `${detail} Anyone landing on it has to read the source to find out what it even is.`,
        scorched: `${detail} Visitors get the confidence of a startup pitch and the documentation of a ransom note.`,
      },
      evidence: [...fact(templates.length ? "readme_template" : "readme_missing"), ...refs],
      archetype: "The Undocumented Visionary",
      headline: { mild: "Great code, mysterious READMEs.", spicy: "Ships features, skips the README.", scorched: "Documentation? Never heard of her." },
    });
  }

  // Languages
  if (fp.languages.length >= 5) {
    const names = fp.languages.slice(0, 5).map((l) => l.name);
    cands.push({
      category: "languages",
      weight: 2 + fp.languages.length * 0.6,
      title: { mild: "A very well-travelled stack", spicy: "Language identity crisis detected", scorched: "Polyglot, or just can't commit?" },
      roast: {
        mild: `${plural(fp.languages.length, "primary language")} across your repos: ${list(names)}. Curious mind, busy package managers.`,
        spicy: `${plural(fp.languages.length, "primary language")}, led by ${list(names)}. You're not building a career, you're collecting runtimes.`,
        scorched: `${plural(fp.languages.length, "primary language")}: ${list(names)}. Every repo is a fresh start with a new syntax and the same unfinished ending.`,
      },
      evidence: [...fact("languages"), ...fact("top_language")],
      archetype: "The Framework Sommelier",
      headline: { mild: "Speaks many languages, finishes some sentences.", spicy: "Fluent in everything, committed to nothing.", scorched: "A new language for every abandoned idea." },
    });
  } else if (fp.languages.length && own.length >= 5 && fp.languages[0].repos / own.length >= 0.8) {
    const l = fp.languages[0];
    cands.push({
      category: "languages",
      weight: 2.5,
      title: { mild: "Loyal to one language", spicy: "One language, no regrets", scorched: "Monogamous with a programming language" },
      roast: {
        mild: `${l.repos} of your ${own.length} repos are ${l.name}. You found your thing and you're sticking to it.`,
        spicy: `${l.repos} of ${own.length} repos in ${l.name}. Other languages exist, they've just never been invited over.`,
        scorched: `${l.repos} of ${own.length} repos are ${l.name}. You don't have a tech stack, you have a tech single.`,
      },
      evidence: [...fact("top_language")],
      archetype: `The ${l.name} Loyalist`,
      headline: { mild: `${l.name} or nothing.`, spicy: `Has met other languages. Chose ${l.name} anyway.`, scorched: `${l.name} isn't a tool, it's a personality.` },
    });
  }

  // Presentation
  const noDesc = own.filter((r) => !r.description);
  const generic = own.filter((r) => isGenericName(r.name));
  if (own.length && (noDesc.length / own.length >= 0.4 || generic.length >= 2)) {
    const examples = generic.length >= 2 ? generic : noDesc;
    cands.push({
      category: "presentation",
      weight: 2 + (noDesc.length / own.length) * 4 + generic.length,
      title: { mild: "The repos could introduce themselves", spicy: "Naming things is hard, and it shows", scorched: "Repo names chosen by a random word generator" },
      roast: {
        mild: `${noDesc.length} of ${own.length} repos have no description${generic.length ? `, and names like ${list(generic.slice(0, 3).map((r) => r.name))} don't help` : ""}.`,
        spicy: `${generic.length >= 2 ? `${list(generic.slice(0, 3).map((r) => r.name))}. Those are repo names, apparently.` : `${noDesc.length} of ${own.length} repos have no description.`} Visitors have to guess what any of it does.`,
        scorched: `${generic.length >= 2 ? `${list(generic.slice(0, 3).map((r) => r.name))}: the naming convention of someone who's run out of ideas and sticky notes.` : `${noDesc.length} of ${own.length} repos with no description.`} Your profile reads like a junk drawer with syntax highlighting.`,
      },
      evidence: [...fact(generic.length >= 2 ? "generic_names" : "no_description"), ...repoRefs(examples)],
      archetype: "The Tutorial Completionist",
      headline:
        generic.length >= 2
          ? { mild: "Lots of projects, very few introductions.", spicy: `${generic.slice(0, 3).map((r) => r.name).join(", ")}. Naming is hard.`.slice(0, 100), scorched: `${generic.slice(0, 2).map((r) => r.name).join(" and ")}: names chosen in a panic.`.slice(0, 100) }
          : { mild: "Lots of projects, very few introductions.", spicy: "Repos with no descriptions, just vibes.", scorched: "A junk drawer with syntax highlighting." },
    });
  }

  // Stars
  if (own.length >= 3) {
    const top = [...own].sort((a, b) => b.stars - a.stars)[0];
    const zero = own.filter((r) => r.stars === 0).length;
    const heavy = top.stars >= 100;
    cands.push({
      category: "stars",
      weight: heavy ? 3 : 1.5 + (zero / own.length) * 3,
      title: heavy
        ? { mild: "One repo is carrying the team", spicy: "A one-hit wonder with a back catalogue", scorched: "One banger and a lot of B-sides" }
        : { mild: "The star economy is in a recession", spicy: "Zero-star review", scorched: "Stars? You can't even find them at night" },
      roast: heavy
        ? {
            mild: `${top.name} has ${plural(top.stars, "star")}. The rest of the profile is quietly standing behind it.`,
            spicy: `${top.name} pulled in ${plural(top.stars, "star")}, and ${zero} of your ${own.length} repos have none. It's carrying the profile like a group project.`,
            scorched: `${top.name}: ${plural(top.stars, "star")}. Everything else is the developer equivalent of a band that only plays its one hit.`,
          }
        : {
            mild: `${zero} of ${own.length} repos have no stars yet. Discovery is a journey.`,
            spicy: `${zero} of ${own.length} repos have zero stars. Even you didn't star them, and you made them.`,
            scorched: `${zero} of ${own.length} repos at zero stars. Not even a pity star from a bot account.`,
          },
      evidence: [...fact(heavy ? "top_repo" : "zero_star_repos"), { kind: "repo", ref: top.name }],
      archetype: heavy ? "The One-Hit Wonder" : "The Underground Artist",
      headline: heavy
        ? { mild: "One hit, many demos.", spicy: "Peaked in one repo, still touring.", scorched: "One good repo and a lot of covers." }
        : { mild: "Cult classic in the making.", spicy: "Building in public. Nobody's watching.", scorched: "Stars: 0. Vibes: also 0." },
    });
  }

  // Activity / commits
  const lazy = fp.commits.filter((c) => /^(update|updates|fix|fixes|fixed|wip|changes|commit|stuff|asdf|test|minor|edit|done|final|\.|-|ok|update readme\.md|add files via upload)\s*\.?$/i.test(c.message.trim()));
  if (lazy.length >= 2) {
    const ex = lazy.slice(0, 3);
    cands.push({
      category: "activity",
      weight: 3 + lazy.length,
      title: { mild: "Commit messages with mystery", spicy: "\"update\" is not a commit message", scorched: "Your git log reads like a hostage note" },
      roast: {
        mild: `Recent commits include ${list(ex.map((c) => `"${c.message}"`))}. Future you would love a little more context.`,
        spicy: `${list(ex.map((c) => `"${c.message}"`))}. ${lazy.length} of ${fp.commits.length} sampled commits say nothing about what changed.`,
        scorched: `${list(ex.map((c) => `"${c.message}"`))}. That's not version control, that's a diary written by someone who forgot how words work.`,
      },
      evidence: [...fact("lazy_commits"), ...ex.map((c) => ({ kind: "commit" as const, ref: c.id }))],
      archetype: "The Cryptic Committer",
      headline: { mild: "Ships quietly. Explains nothing.", spicy: "git commit -m \"update\" (x" + lazy.length + ")", scorched: "Every commit message is a cry for help." },
    });
  } else if (fp.activity.available && fp.activity.eventCount === 0 && own.length) {
    cands.push({
      category: "activity",
      weight: 2.5,
      title: { mild: "Public activity is on mute", spicy: "Radio silence", scorched: "Last seen: unclear" },
      roast: {
        mild: "GitHub shows no public events in the last 90 days. Either it's all private work or you're on a well-earned break.",
        spicy: "Zero public events in 90 days. The repos are still here, the developer has left the building.",
        scorched: "No public events in 90 days. Your profile is a museum: nice exhibits, no staff.",
      },
      evidence: [...fact("recent_events"), ...fact("last_push")],
      archetype: "The Quiet Maintainer",
      headline: { mild: "Busy elsewhere, apparently.", spicy: "Public activity: buffering.", scorched: "Pushed once. Ghosted forever." },
    });
  }

  // Forks
  if (fp.repos.length >= 4 && forks.length / fp.repos.length >= 0.5) {
    cands.push({
      category: "personality",
      weight: 2 + (forks.length / fp.repos.length) * 4,
      title: { mild: "A generous forker", spicy: "Fork first, ask questions never", scorched: "Your profile is mostly other people's code" },
      roast: {
        mild: `${forks.length} of ${fp.repos.length} listed repos are forks, like ${list(forks.slice(0, 2).map((r) => r.name))}. Collecting inspiration is valid.`,
        spicy: `${forks.length} of ${fp.repos.length} repos are forks. ${list(forks.slice(0, 2).map((r) => r.name))} are bookmarks with extra steps.`,
        scorched: `${forks.length} of ${fp.repos.length} repos are forks. You're not a developer, you're a curator of other people's ambitions.`,
      },
      evidence: [...fact("fork_share"), ...repoRefs(forks, 2)],
      archetype: "The Fork Collector",
      headline: { mild: "Forks now, builds later.", spicy: "Mostly forks, some ambition.", scorched: "Professional forker, amateur committer." },
    });
  }

  // Empty profile
  if (own.length === 0) {
    cands.push({
      category: "personality",
      weight: 10,
      title: { mild: "A blank canvas", spicy: "Nothing to see here, literally", scorched: "The emptiest profile we've ever opened" },
      roast: {
        mild: `@${fp.profile.login} has no public repositories of their own yet. Whatever you're building, it's a well-kept secret.`,
        spicy: `No public repos of your own after ${fp.facts.find((f) => f.id === "account_age")?.value ?? "all this time"}. Mysterious. Or very, very private.`,
        scorched: `Zero public repos of your own. We came to roast your code and found an empty fridge with the light on.`,
      },
      evidence: [...fact("public_repos"), ...fact("account_age")],
      archetype: "The Private Repository",
      headline: { mild: "All potential, no public repos.", spicy: "Commitment is a private repository.", scorched: "The ghost of GitHub past." },
    });
  }

  if (own.length === 0) {
    const ev = fp.activity.eventCount;
    cands.push({
      category: "activity",
      weight: 9,
      title: { mild: "Quiet on the public front", spicy: "The silence is deafening", scorched: "Even the activity feed gave up" },
      roast: {
        mild: `${plural(ev, "public event")} in the last 90 days and ${plural(fp.profile.followers, "follower")}. A peaceful little corner of GitHub.`,
        spicy: `${plural(ev, "public event")} in 90 days. ${plural(fp.profile.followers, "follower")} waiting for literally anything to happen.`,
        scorched: `${plural(ev, "public event")} in 90 days. Your followers are watching an empty stage and calling it minimalism.`,
      },
      evidence: [...(fp.activity.available ? fact("recent_events") : []), ...fact("followers")].slice(0, 2),
      archetype: "The Private Repository",
      headline: { mild: "Quietly existing on GitHub.", spicy: "Commitment is a private repository.", scorched: "The ghost of GitHub past." },
    });
  }

  const ranked = cands.filter((c) => c.evidence.length).sort((a, b) => b.weight - a.weight);
  const seed = hash(fp.profile.login + intensity);
  if (ranked.length < 2) {
    // Not enough distinctive signal: an honest, evidence-based "clean profile" comment.
    ranked.push({
      category: ranked.some((c) => c.category === "personality") ? "presentation" : "personality",
      weight: 1,
      title: { mild: "Annoyingly tidy", spicy: "Nothing to roast is its own roast", scorched: "Suspiciously clean" },
      roast: {
        mild: `${plural(own.length, "repo")} and we couldn't find much to tease. That's the most irritating result possible.`,
        spicy: `${plural(own.length, "repo")}, reasonable READMEs, sensible names. Who hurt you?`,
        scorched: `${plural(own.length, "repo")} and barely a crime scene. Either you're a great developer or you've hidden the bodies in private repos.`,
      },
      evidence: [...fact("repos_analyzed"), ...fact("public_repos")].slice(0, 1),
      archetype: "The Suspiciously Clean Coder",
      headline: { mild: "Hard to roast. We tried.", spicy: "Too tidy to trust.", scorched: "Clean profile, dirty secrets?" },
    });
  }

  const picked = ranked.slice(0, 5);
  const lead = picked[0];
  const comments: ReviewComment[] = picked.map((c) => ({ category: c.category, title: c.title[intensity], roast: c.roast[intensity], evidence: c.evidence.slice(0, 4) }));

  const name = fp.profile.name ?? `@${fp.profile.login}`;
  const read = fp.readmes.filter((r) => !r.missing).length;
  const opener = own.length
    ? {
        mild: `We read ${name}'s ${plural(fp.repos.length, "most recently pushed public repo")}, ${plural(read, "README")} and the recent commit history, with love and a magnifying glass.`,
        spicy: `We went through ${name}'s ${plural(fp.repos.length, "most recently pushed public repo")}, ${plural(read, "README")} and recent commits, so you don't have to.`,
        scorched: `We read ${name}'s ${plural(fp.repos.length, "most recently pushed public repo")}, ${plural(read, "README")} and recent commits like a reviewer who skipped lunch.`,
      }[intensity]
    : `${name} has no public repositories of their own, so we read everything GitHub does show: the profile, the follower counts and the public activity feed.`;
  const mainLines = picked.slice(0, 4).map((c) => (MAIN_LINES[c.archetype] ?? c.headline)[intensity]).filter((l, i, a) => a.indexOf(l) === i);
  const mainRoast = [opener, ...mainLines].join(" ").slice(0, 1150);

  const closers: ByHeat[] = [
    { mild: "Approved with comments. Lots of comments.", spicy: "Changes requested. All of them.", scorched: "Closing this profile as won't fix." },
    { mild: "LGTM, mostly. Mostly.", spicy: "Please rebase your personality onto main.", scorched: "git revert --hard everything. Start again." },
  ];

  return {
    headline: lead.headline[intensity],
    archetype: lead.archetype,
    summary: {
      mild: `A friendly review of ${plural(comments.length, "thing")} worth tidying up.`,
      spicy: `${plural(comments.length, "issue")} found. None of them are blocking, all of them are embarrassing.`,
      scorched: `${plural(comments.length, "issue")} found, and every one has receipts.`,
    }[intensity],
    mainRoast,
    comments,
    closingLine: closers[seed % closers.length][intensity],
  };
}
