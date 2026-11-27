import type { Intensity } from "@/types/roast";
import type { Signals } from "./analyze";

export interface Ctx {
  topic: string | null;
  topic2: string | null;
  sub: string | null;
}

type Line = (c: Ctx) => string;
type ByIntensity<T> = Record<Intensity, T[]>;

export interface Archetype {
  id: string;
  title: string;
  /** How strongly the signals point at this archetype (0 = not at all). */
  score: (s: Signals) => number;
  descriptions: Line[];
  headlines: string[];
  behaviourClass: string;
  traits: string[];
  openers: ByIntensity<Line>;
  kickers: ByIntensity<Line>;
  closers: ByIntensity<string>;
}

const per = (n: number, words: number) => (words ? (n / words) * 100 : 0);
const about = (c: Ctx, fallback: string) => c.topic ?? fallback;

export const ARCHETYPES: Archetype[] = [
  {
    id: "overthinker",
    title: "The Professional Overthinker",
    score: (s) => per(s.markers.overthink.count, s.wordCount) * 3 + (s.avgWordsPerItem > 70 ? 2 : 0) + s.ellipses * 0.3,
    descriptions: [
      () => "Treats every decision like a hostage negotiation with themselves. Has drafted, deleted and re-drafted this description in their head already.",
      (c) => `Can turn a simple question about ${about(c, "literally anything")} into a four-act internal drama with an unresolved ending.`,
    ],
    headlines: ["I WROTE AN ESSAY TO ASK A YES/NO QUESTION", "I'VE BEEN THINKING ABOUT IT SINCE 2019", "WHAT IF THIS HEADLINE IS WRONG"],
    behaviourClass: "Recursive Doubt Loop, Stage III",
    traits: ["Overthinking", "Hedging", "Scenario planning", "Paragraph abuse"],
    openers: {
      playful: [
        () => "You don't make decisions, you open committees.",
        () => "Somewhere a simple choice is still waiting for you to finish weighing your options.",
      ],
      brutal: [
        () => "You've never had a thought you didn't immediately second-guess, and honestly that includes this one.",
        () => "Your brain has more open tabs than a laptop that hasn't been restarted since the Obama administration.",
      ],
      savage: [
        () => "You don't overthink, you over-engineer anxiety: version-controlled, peer-reviewed, and still not shipped.",
        () => "Your inner monologue needs a table of contents, and every chapter is titled 'but what if'.",
      ],
    },
    kickers: {
      playful: [() => "It's thoughtful. It's also exhausting to watch."],
      brutal: [() => "The rest of us read 'maybe' as a word. You read it as a lifestyle."],
      savage: [() => "Your decisiveness has a loading bar, and it's been stuck at 99% for years."],
    },
    closers: {
      playful: ["Go ahead, make a decision. We'll wait. We will, unfortunately, be waiting."],
      brutal: ["You'll read this roast four times and find a fifth interpretation."],
      savage: ["You're going to lie awake tonight wondering if you deserved this. You did. Sleep well."],
    },
  },
  {
    id: "online",
    title: "The Chronically Online",
    score: (s) => per(s.markers.online.count, s.wordCount) * 2.5 + s.subreddits.length * 0.8 + s.emojiCount * 0.2,
    descriptions: [
      () => "Speaks fluent internet and is slowly losing the ability to speak anything else.",
      (c) => `Has opinions about ${about(c, "everything")} that were clearly formed in a comment section at 2am.`,
    ],
    headlines: ["MY SCREEN TIME REPORT IS A CRY FOR HELP", "I HAVE NOT SEEN GRASS IN WEEKS", "I SAID 'LMAO' OUT LOUD ONCE"],
    behaviourClass: "Terminal Scroller, Class IV",
    traits: ["Fluent in memes", "Reply speed", "Context collapse", "Nocturnal"],
    openers: {
      playful: [
        () => "You type 'lol' with a completely straight face, and we respect the commitment.",
        () => "Your internet slang has its own internet slang.",
      ],
      brutal: [
        () => "You don't use the internet. The internet is the weather where you live.",
        () => "Your phone gets more face time than any person in your life, and the phone is tired too.",
      ],
      savage: [
        () => "You've said 'touch grass' to strangers so often that grass has filed a restraining order against the phrase.",
        () => "If the Wi-Fi went down you'd have to meet yourself, and neither of you is ready for that.",
      ],
    },
    kickers: {
      playful: [(c) => (c.sub ? `Bold of you to keep showing up in ${c.sub} like it's your local coffee shop.` : "Hydrate. Blink. Look at a tree.")],
      brutal: [(c) => (c.sub ? `${c.sub} isn't a hobby at this point, it's a mailing address.` : "Your algorithm knows you better than your family, and it's worried.")],
      savage: [(c) => (c.sub ? `You treat ${c.sub} like a group chat where nobody asked you to join.` : "Your brain is 60% water and 40% screenshots.")],
    },
    closers: {
      playful: ["Close the app. Go outside. Come back and post about it, we know you will."],
      brutal: ["Log off. Not forever. Just long enough for the rest of us to finish a thought."],
      savage: ["Somewhere, a sunset happened today. You saw it as a repost."],
    },
  },
  {
    id: "therapist",
    title: "The Unpaid Therapist",
    score: (s) => per(s.markers.advice.count, s.wordCount) * 3.2 + (s.topics.some((t) => t.id === "relationships") ? 1.2 : 0),
    descriptions: [
      () => "Gives out emotional support like free samples at a mall: generously, constantly, and to people who did not ask.",
      (c) => `Has the confidence of a licensed professional and the credentials of someone who once read a thread about ${about(c, "boundaries")}.`,
    ],
    headlines: ["I GIVE GREAT ADVICE I'VE NEVER FOLLOWED", "HAVE YOU TRIED COMMUNICATING? (I HAVEN'T)", "MY COPAY IS ZERO AND SO ARE MY BOUNDARIES"],
    behaviourClass: "Volunteer Counsellor, Unlicensed",
    traits: ["Advice dispenser", "'Red flag' spotter", "Emotional labour", "Boundary talker"],
    openers: {
      playful: [
        () => "You hand out advice like it's Halloween and you're the good house.",
        () => "You've said 'communicate with them' so many times it's basically your ringtone.",
      ],
      brutal: [
        () => "You fix strangers' lives with the confidence of someone whose own life is still in the group chat for feedback.",
        () => "You can spot a red flag from three paragraphs away, as long as it isn't waving in your own direction.",
      ],
      savage: [
        () => "You run a free emotional support hotline for strangers, open 24/7, staffed entirely by someone who should be calling one.",
        () => "You've diagnosed more internet strangers than a medical drama, with roughly the same accuracy.",
      ],
    },
    kickers: {
      playful: [() => "Your heart is in the right place. Your schedule is not."],
      brutal: [() => "Charge for it. At least then the denial would be profitable."],
      savage: [() => "The call is coming from inside the house, and the house has unread messages."],
    },
    closers: {
      playful: ["Have you tried taking your own advice? We hear it's very good."],
      brutal: ["Free advice: stop giving free advice."],
      savage: ["This roast is a red flag. Communicate your feelings about it. You know how."],
    },
  },
  {
    id: "arguer",
    title: "The Argument Specialist",
    score: (s) => per(s.markers.argue.count, s.wordCount) * 3 + s.questionMarks * 0.15 + s.shoutedWords * 0.2,
    descriptions: [
      () => "Reads every comment like a legal brief and every reply like a summons.",
      (c) => `Has never once lost an argument about ${about(c, "anything")}. Has, however, been left on read by the other side.`,
    ],
    headlines: ["I ARGUE WITH STRANGERS FOR FREE", "WELL, ACTUALLY, THIS IS A GREAT HEADLINE", "I HAVE BEEN 'TECHNICALLY CORRECT' SINCE BIRTH"],
    behaviourClass: "Comment-Section Litigator, Class II",
    traits: ["Well-actually", "Source demander", "Last word", "Pedantry"],
    openers: {
      playful: [
        () => "You never start fights online, you just finish them, repeatedly, for days.",
        () => "You type 'actually' the way other people type 'hello'.",
      ],
      brutal: [
        () => "You argue with strangers like there's a scoreboard, and the only one keeping score is you.",
        () => "Your idea of a peaceful afternoon is correcting someone's correction of a correction.",
      ],
      savage: [
        () => "You've won so many internet arguments that you've earned the grand prize: nothing, from no one, forever.",
        () => "You don't have conversations, you have depositions with a reply button.",
      ],
    },
    kickers: {
      playful: [(c) => (c.topic ? `Especially about ${c.topic}. Lord help the person who's wrong about ${c.topic}.` : "Some people unwind with yoga. You unwind with rebuttals.")],
      brutal: [(c) => (c.topic ? `On ${c.topic}, you're not a participant, you're a self-appointed referee who also plays.` : "Being right is your cardio.")],
      savage: [(c) => (c.topic ? `Every ${c.topic} thread is a crime scene, and you keep returning to it.` : "You'd argue with this roast if it had a reply button. Thankfully it doesn't.")],
    },
    closers: {
      playful: ["You're technically correct. That's the best kind of exhausting."],
      brutal: ["Source? Your own comments. Case closed."],
      savage: ["You can't reply to this one. Feel that? That's what everyone else feels."],
    },
  },
  {
    id: "detective",
    title: "The Digital Detective",
    score: (s) => per(s.markers.detective.count, s.wordCount) * 3 + (s.markers.argue.hits["source?"] ?? 0) * 0.8,
    descriptions: [
      () => "Can find a stranger's high-school volleyball stats in nine minutes but can't find their own keys.",
      () => "Treats every viral post like an unsolved case and every comment section like an evidence board.",
    ],
    headlines: ["I FOUND THE ORIGINAL POST FROM 2014", "I HAVE A CORKBOARD AND RED STRING", "I'VE ALREADY CHECKED YOUR POST HISTORY"],
    behaviourClass: "Amateur Investigator, Unpaid",
    traits: ["Receipt keeper", "Reverse searcher", "Timeline builder", "Unsettlingly thorough"],
    openers: {
      playful: [
        () => "You read comment sections like they're crime novels and you're three pages from the twist.",
        () => "You don't believe anything until you've seen the archived version.",
      ],
      brutal: [
        () => "You could locate a stranger from one blurry window reflection, but you've let a 'quick question' email sit for a month.",
        () => "Your browser history looks like a detective show where the detective really needs a new hobby.",
      ],
      savage: [
        () => "You've done more unpaid research into internet strangers than most people do for their mortgage.",
        () => "You'd make an incredible investigator if any of your cases mattered to anyone but you.",
      ],
    },
    kickers: {
      playful: [() => "Honestly? Useful. Slightly frightening. Mostly useful."],
      brutal: [() => "Case closed. Social life: still open, still unsolved."],
      savage: [() => "The real mystery is what you'd accomplish if you aimed this at your own life."],
    },
    closers: {
      playful: ["You already know who made this roast. You've probably found the commit history."],
      brutal: ["Investigate this: why you're like this."],
      savage: ["We'd tell you to get a life, but you'd just reverse-image search one."],
    },
  },
  {
    id: "productivity",
    title: "The Productivity Pretender",
    score: (s) => per(s.markers.productivity.count, s.wordCount) * 3.2,
    descriptions: [
      () => "Has optimised every part of their routine except the part where they do the thing.",
      () => "Owns three planners, two apps and one unread copy of a book about habits.",
    ],
    headlines: ["I SPENT 4 HOURS SETTING UP MY TO-DO APP", "MY ROUTINE HAS A ROUTINE", "I'M BUILDING A SYSTEM (I'M NOT WORKING)"],
    behaviourClass: "Workflow Hobbyist, Pre-Launch",
    traits: ["System builder", "App collector", "Planner hoarder", "Strategic procrastination"],
    openers: {
      playful: [
        () => "You've got a system for everything, including a system for picking which system to use.",
        () => "Your to-do list has a to-do list, and both are colour-coded.",
      ],
      brutal: [
        () => "You've watched enough productivity videos to earn a degree in getting nothing done efficiently.",
        () => "Your workflow is beautiful. It's a shame nothing ever flows through it.",
      ],
      savage: [
        () => "You spend so long optimising the morning routine that it's dinner by the time you're ready to start.",
        () => "You've built a second brain because the first one keeps scrolling.",
      ],
    },
    kickers: {
      playful: [() => "Somewhere, a task marked 'urgent' from March is still waiting."],
      brutal: [() => "You're not productive, you're productivity-adjacent."],
      savage: [() => "Your greatest output so far is the setup."],
    },
    closers: {
      playful: ["Add 'read roast' to your to-do list. Then check it off. Feels good, right?"],
      brutal: ["Close the app. Open the task. You know which one."],
      savage: ["You'll schedule time to reflect on this roast. You won't reflect on it."],
    },
  },
  {
    id: "main",
    title: "The Main Character",
    score: (s) => s.firstPersonRatio * 60 + per(s.markers.mainCharacter.count, s.wordCount) * 3 + s.exclamations * 0.15,
    descriptions: [
      () => "Narrates their own life in the third person, and is the only one watching.",
      () => "Every story they tell has a plot twist, a dramatic pause and, somehow, an audience that isn't there.",
    ],
    headlines: ["EVERYONE AT THE PARTY WAS STARING (AT ME)", "EDIT: THANKS FOR THE ATTENTION, I NEEDED IT", "MY LIFE IS A MOVIE AND I'M CASTING IT"],
    behaviourClass: "Self-Cast Protagonist, Season 4",
    traits: ["Narrator energy", "'Edit:' enjoyer", "Plot twists", "Spotlight seeking"],
    openers: {
      playful: [
        () => "You tell stories like there's a soundtrack only you can hear.",
        () => "Every anecdote you post has a cold open and a season finale.",
      ],
      brutal: [
        () => "You've never posted a story where you weren't the hero, the victim and the plot twist all at once.",
        () => "You say 'I' more than a toddler in a mirror, and with the same fascination.",
      ],
      savage: [
        () => "The world is not watching you. The world is buffering.",
        () => "Your life is a movie, but the reviews are in, and the audience left during the first act.",
      ],
    },
    kickers: {
      playful: [() => "Honestly, we'd watch it. Once. On mute."],
      brutal: [() => "Not every trip to the grocery store needs an 'EDIT: wow this blew up'."],
      savage: [() => "You're the main character only because nobody else auditioned."],
    },
    closers: {
      playful: ["Roll credits. You're still in every scene."],
      brutal: ["EDIT: Thanks for reading this roast about me. Wait, that's you."],
      savage: ["Spoiler: the twist is that you're a side character in everyone else's story."],
    },
  },
  {
    id: "lurker",
    title: "The Certified Lurker",
    score: (s) => (s.sparse ? 6 : 0) + s.markers.lurker.count * 2.5 + (s.itemCount <= 2 ? 1 : 0),
    descriptions: [
      () => "Has seen everything. Has said almost nothing. Is, in internet terms, a ghost with an account.",
      () => "Moves through the internet like a cat through a dinner party: present, silent, judging.",
    ],
    headlines: ["I'VE BEEN WATCHING FOR YEARS", "I UPVOTE IN SILENCE", "MY POST HISTORY IS A WITNESS PROTECTION PROGRAMME"],
    behaviourClass: "Silent Observer, Clearance Level 5",
    traits: ["Silent upvoter", "Read-only mode", "Plausible deniability", "Mysterious (lazy)"],
    openers: {
      playful: [
        () => "You gave us so little to work with that this roast is mostly vibes, which suits you perfectly.",
        () => "Your posting history is shorter than most people's usernames.",
      ],
      brutal: [
        () => "You handed us the receipts and they were blank. That's not mystery, that's an empty fridge.",
        () => "You've consumed thousands of threads and contributed the conversational equivalent of a nod.",
      ],
      savage: [
        () => "You came to a roast site and brought nothing to roast, which is the most damning evidence we could ask for.",
        () => "You're not a lurker, you're a ghost who is too shy to haunt.",
      ],
    },
    kickers: {
      playful: [() => "Next time, bring receipts. We promise to be (somewhat) gentle."],
      brutal: [() => "Even your silence feels like it's taking notes."],
      savage: [() => "Your digital footprint is a tiptoe."],
    },
    closers: {
      playful: ["Post something. Anything. We're begging, gently."],
      brutal: ["Come back with more receipts. Or don't. You probably won't."],
      savage: ["You'll read this, say nothing, and somehow that proves our point."],
    },
  },
  {
    id: "contradiction",
    title: "The Walking Contradiction",
    score: (s) => s.contradictions.length * 3.2 + s.markers.hedge.count * 0.8,
    descriptions: [
      () => "Holds strong opinions on both sides of most issues, often within the same paragraph.",
      () => "A living 'yes, and also no'. Their opinions come with a built-in undo button.",
    ],
    headlines: ["I DON'T CARE (I WROTE 600 WORDS ABOUT IT)", "I'M NOT SAYING IT, BUT I'M SAYING IT", "UNPOPULAR OPINION: I AGREE WITH EVERYONE"],
    behaviourClass: "Paradox Generator, Unstable",
    traits: ["Hot-take hedger", "Self-rebuttal", "Plot holes", "Selective chill"],
    openers: {
      playful: [
        () => "You contain multitudes. Unfortunately, they all post.",
        () => "Your opinions have opinions about your other opinions.",
      ],
      brutal: [
        () => "You argue both sides so well that you've lost to yourself several times.",
        () => "Your stance on most things is 'it's complicated', mostly because you complicated it.",
      ],
      savage: [
        () => "You're the kind of contradiction philosophers would study, if they could get you to finish a sentence without a 'but'.",
        () => "If hypocrisy were a sport you'd be in the hall of fame, and you'd insist you never played.",
      ],
    },
    kickers: {
      playful: [() => "It's charming. It's confusing. It's both, which feels right."],
      brutal: [() => "Pick a lane. Any lane. Please stop merging."],
      savage: [() => "You'll disagree with this roast, then agree with it, then post about not caring."],
    },
    closers: {
      playful: ["You'll love this roast. Or hate it. Probably both, out loud."],
      brutal: ["No offense, but: every take you've ever had."],
      savage: ["You're not complex. You're just unresolved."],
    },
  },
  {
    id: "philosopher",
    title: "The Internet Philosopher",
    score: (s) => per(s.markers.philosophy.count, s.wordCount) * 3 + (s.avgWordsPerItem > 90 ? 1 : 0),
    descriptions: [
      () => "Turns a thread about a sandwich into a meditation on the human condition.",
      (c) => `Believes ${about(c, "every topic")} is secretly about society, and will explain why at length.`,
    ],
    headlines: ["THIS SANDWICH IS A METAPHOR FOR SOCIETY", "I'VE READ ONE STOIC QUOTE AND I'M CHANGED", "WHAT IS A HEADLINE, REALLY?"],
    behaviourClass: "Comment-Section Philosopher, Self-Accredited",
    traits: ["Deep (ish)", "Big words", "Society truther", "Quote collector"],
    openers: {
      playful: [
        () => "You see a meme and immediately ask what it says about us as a species.",
        () => "You've never answered a simple question without first questioning the question.",
      ],
      brutal: [
        () => "You philosophise like someone who owns exactly one book and has quoted it in every argument since.",
        () => "You're not deep. You're a puddle with a thesaurus.",
      ],
      savage: [
        () => "Socrates asked questions to find the truth. You ask them because nobody's listening otherwise.",
        () => "You treat comment sections like ancient Athens, except nobody asked, and there's no agora, just ads.",
      ],
    },
    kickers: {
      playful: [() => "It's genuinely thoughtful. It is also 2am, and nobody's ready."],
      brutal: [() => "The unexamined life may not be worth living, but the over-examined one isn't worth reading."],
      savage: [() => "If a tree falls in a forest and you're there, you'll write a thread about it that nobody finishes."],
    },
    closers: {
      playful: ["What is a roast, really? (This. This is a roast.)"],
      brutal: ["Cogito, ergo post. Unfortunately."],
      savage: ["You think, therefore you post. We wish you'd just think."],
    },
  },
];

export function rankArchetypes(signals: Signals): { archetype: Archetype; score: number }[] {
  return ARCHETYPES.map((archetype) => ({ archetype, score: archetype.score(signals) }))
    .sort((a, b) => b.score - a.score);
}
