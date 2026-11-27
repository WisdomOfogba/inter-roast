const ITEMS = [
  "The Professional Overthinker",
  "The Chronically Online",
  "The Unpaid Therapist",
  "The Argument Specialist",
  "The Digital Detective",
  "The Productivity Pretender",
  "The Main Character",
  "The Certified Lurker",
  "The Walking Contradiction",
  "The Internet Philosopher",
];

export function Ticker() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ITEMS.map((t) => (
        <li key={t} className="flex items-center whitespace-nowrap px-5 font-display text-2xl tracking-wide sm:text-3xl">
          {t.toUpperCase()}
          <span aria-hidden className="ml-10 inline-block size-3 rotate-45 bg-heat" />
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Some of the personalities we hand out" className="overflow-hidden border-y-2 border-ink bg-ink py-4 text-acid">
      <div className="marquee-track flex w-max animate-marquee">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
