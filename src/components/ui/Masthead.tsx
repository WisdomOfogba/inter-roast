import Link from "next/link";

export function Masthead({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <header className={`${dark ? "bg-ink text-paper border-ink-3" : "bg-paper text-ink border-ink"} border-b-2`}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 font-display text-[22px] leading-none tracking-wide" aria-label="Internet Roast, home">
          <span aria-hidden className="inline-block size-3.5 rotate-45 bg-heat transition-transform group-hover:rotate-[135deg]" />
          INTERNET ROAST
        </Link>
        <p className={`hidden font-mono text-[11px] uppercase tracking-[0.16em] md:block ${dark ? "text-stone-light" : "text-stone"}`}>
          Vol. 01 · Receipts-based comedy · Not a psych eval
        </p>
        <Link
          href="/roast"
          className={`inline-flex min-h-10 items-center border-2 px-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] transition-colors ${
            dark ? "border-paper hover:bg-paper hover:text-ink" : "border-ink hover:bg-ink hover:text-paper"
          }`}
        >
          Get roasted
        </Link>
      </div>
    </header>
  );
}
