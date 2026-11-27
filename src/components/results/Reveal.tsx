import type { RoastRecord } from "@/types/roast";

const SOURCE_NOTE: Record<string, string> = {
  unconfigured: "Written by the house engine: a rules-based roaster that only counts what's in your receipts.",
  quota: "Our AI writer hit its free daily limit, so the house engine (rules-based) wrote this one. Try again later for the AI version.",
  unavailable: "Our AI writer was unavailable, so the house engine (rules-based) wrote this one instead.",
  invalid_output: "Our AI writer fumbled its lines, so the house engine (rules-based) stepped in.",
  blocked: "Our AI writer's safety filter tripped, so the house engine (rules-based) wrote a cleaner roast.",
};

export function sourceNote(record: RoastRecord): string {
  if (record.source === "gemini") return `Written by Google Gemini (${record.model ?? "Gemini"}) from your receipts, checked before display.`;
  return SOURCE_NOTE[record.fallbackReason ?? "unconfigured"];
}

/**
 * The reveal: classification first, then score, roast, observations and the
 * closer. Pure CSS animation (staggered), no client JS.
 */
export function Reveal({ record }: { record: RoastRecord }) {
  const r = record.result;
  const filled = Math.round(r.roastScore);

  return (
    <article className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14" aria-labelledby="persona">
      <div className="flex animate-rise flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-ink-3 pb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-stone-light">
        <span className="bg-acid px-2 py-0.5 font-semibold text-ink">Case {record.caseId}</span>
        <span>{record.handle ? `Subject: u/${record.handle}` : "Subject: anonymous"}</span>
        <span className="text-heat">Status: roasted</span>
      </div>

      <p className="mt-10 animate-rise font-mono text-xs uppercase tracking-[0.18em] text-acid delay-1">Your internet personality is</p>
      <h1 id="persona" className="mt-3 animate-rise font-display text-[clamp(3.1rem,11.5vw,8.5rem)] uppercase leading-[0.86] tracking-[-0.005em] text-paper delay-1 [text-wrap:balance]">
        {r.personalityTitle}
      </h1>
      <p className="mt-6 max-w-3xl animate-rise font-serif text-[clamp(1.5rem,4vw,2.25rem)] italic leading-[1.12] text-bone delay-2">{r.personalityDescription}</p>

      {/* Score */}
      <div className="mt-10 grid animate-rise items-end gap-6 border-y-2 border-ink-3 py-6 delay-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-10">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-8xl leading-[0.8] text-paper sm:text-9xl">{r.roastScore.toFixed(1)}</span>
          <span className="font-mono text-sm text-stone-light">/10</span>
        </div>
        <div>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-stone-light">Roast rating</p>
          <div className="flex gap-1.5" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={r.roastScore} aria-label="Roast rating">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className={`h-5 flex-1 ${i < filled ? "bg-heat" : "bg-ink-3"}`} />
            ))}
          </div>
        </div>
        <div
          className="justify-self-start animate-stamp border-4 border-heat px-4 pb-1.5 pt-2.5 font-display text-3xl uppercase leading-none tracking-wider text-heat delay-4 sm:justify-self-end"
          style={{ ["--stamp-rot" as string]: "-7deg" }}
        >
          {r.roastIntensity}
        </div>
      </div>

      {/* Main roast */}
      <section aria-label="The roast" className="mt-12 animate-rise delay-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-light">The roast</p>
        <p className="mt-4 text-[clamp(1.25rem,2.6vw,1.75rem)] font-medium leading-[1.45] text-paper">{r.mainRoast}</p>
      </section>

      {/* Observations */}
      <section aria-label="Observations" className="mt-12 animate-rise delay-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-light">Supporting evidence</p>
        <ol className="mt-4 border-t-2 border-ink-3">
          {r.observations.map((o, i) => (
            <li key={i} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 border-b-2 border-ink-3 py-5 sm:grid-cols-[5rem_minmax(0,1fr)]">
              <span className="font-display text-4xl leading-none text-acid sm:text-5xl">0{i + 1}</span>
              <span className="text-lg leading-relaxed text-bone sm:text-xl">{o}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Classification + traits */}
      <section aria-label="Classification" className="mt-10 grid animate-rise gap-8 delay-5 md:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-light">Internet behaviour classification</p>
          <p className="mt-3 font-display text-3xl uppercase leading-tight text-paper">{r.behaviourClass}</p>
          <ul className="mt-5 space-y-3">
            {r.indicators.map((ind) => (
              <li key={ind.label} className="flex items-center justify-between gap-4">
                <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-bone">{ind.label}</span>
                <span className="flex gap-1" aria-label={`${ind.level} out of 5`}>
                  {Array.from({ length: 5 }, (_, k) => (
                    <span key={k} className={`h-3.5 w-6 border-2 ${k < ind.level ? "border-heat bg-heat" : "border-ink-3"}`} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-light">Personality traits</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {r.personalityTraits.map((t) => (
              <li key={t} className="border-2 border-paper px-3 py-1.5 font-mono text-[13px] uppercase tracking-[0.06em] text-paper">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closer */}
      <section aria-label="Closing statement" className="mt-14 animate-rise border-t-2 border-ink-3 pt-10 delay-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-light">Closing statement</p>
        <p className="mt-4 font-serif text-[clamp(2rem,5.5vw,3.75rem)] italic leading-[1.05] text-acid">{r.closingStatement}</p>
      </section>

      <p className="mt-10 max-w-3xl animate-rise border-l-4 border-ink-3 pl-4 text-sm leading-relaxed text-stone-light delay-6">
        {sourceNote(record)} {record.sparse && "Your receipts were thin, so this one runs on limited evidence. "}
        Comedy based only on the text that was submitted. Not a psychological assessment.
      </p>
    </article>
  );
}
