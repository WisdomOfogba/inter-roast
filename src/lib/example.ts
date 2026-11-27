import type { RoastRecord } from "@/types/roast";

/** A clearly-labelled sample used on the landing page. Not a real person. */
export const EXAMPLE_RECORD: RoastRecord = {
  v: 1,
  caseId: "IR-EXAMPLE",
  handle: "example_user",
  source: "engine",
  sparse: false,
  createdAt: Date.UTC(2026, 10, 27),
  result: {
    personalityTitle: "The Spreadsheet Romantic",
    personalityDescription: "Budgets every coffee, then writes 400 words about whether to text back.",
    headline: "MY BUDGET HAS 14 TABS AND NO CHILL",
    mainRoast:
      "You track every latte to the cent but can't track how many times you've said 'I'm not saying, but'. You treat index funds like a love language and your love life like a market you're too scared to enter. Your posts read like a TED talk that keeps pausing to check if the audience is mad at it.",
    observations: [
      "You put money in VTSAX the way other people light candles: ritually, and for emotional support.",
      "'Unpopular opinion' appears right before the most popular opinion on the subreddit.",
      "You asked for relationship advice, got it, then argued with it. Classic.",
    ],
    personalityTraits: ["Spreadsheet brain", "Hot-take hedger", "Compound interest", "Overthinking"],
    behaviourClass: "Fiscal Overthinker, Class II",
    indicators: [
      { label: "Budget tabs", level: 5 },
      { label: "Hedging", level: 4 },
      { label: "Chill", level: 1 },
    ],
    roastScore: 8.7,
    roastIntensity: "savage",
    closingStatement: "You've diversified everything except your personality.",
  },
};
