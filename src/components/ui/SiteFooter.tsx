export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl leading-none">INTERNET ROAST</p>
          <p className="mt-3 max-w-xs font-serif text-xl italic leading-snug text-bone">The internet has receipts. Let&apos;s use them.</p>
        </div>
        <div className="text-sm leading-relaxed text-bone">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-acid">The fine print</p>
          <p className="mt-2">
            Roasts are comedy, not psychological assessments. They&apos;re based only on what you paste in, and they can be wrong, unfair and extremely
            accurate, sometimes all at once.
          </p>
        </div>
        <div className="text-sm leading-relaxed text-bone">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-acid">Not affiliated</p>
          <p className="mt-2">
            Internet Roast is not affiliated with or endorsed by Reddit. We don&apos;t fetch, scrape or store Reddit data. Roast yourself, or a friend
            who&apos;s in on it.
          </p>
        </div>
      </div>
    </footer>
  );
}
