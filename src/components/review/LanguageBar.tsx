import type { LanguageShare } from "@/types/github";

const SLOTS = ["bg-series-1", "bg-series-2", "bg-series-3", "bg-series-4", "bg-series-5"];

/**
 * Thin segmented bar + list (dataviz skill: the list carries names and figures,
 * a swatch per row replaces a legend). Max 5 languages, the tail folds into Other.
 */
export function LanguageBar({ languages }: { languages: LanguageShare[] }) {
  if (!languages.length) return <p className="text-[15px] text-muted">No primary languages detected.</p>;
  const top = languages.slice(0, 5);
  const rest = languages.slice(5).reduce((s, l) => s + l.repos, 0);
  const rows = [...top.map((l, i) => ({ ...l, cls: SLOTS[i] })), ...(rest ? [{ name: `Other (${languages.length - 5})`, repos: rest, cls: "bg-series-other" }] : [])];
  const total = rows.reduce((s, r) => s + r.repos, 0);
  return (
    <figure>
      <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`Primary languages: ${rows.map((r) => `${r.name} ${r.repos}`).join(", ")}`}>
        {rows.map((r) => (
          <span key={r.name} className={`${r.cls} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${(r.repos / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3 text-[15px]">
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${r.cls}`} />
              <span className="truncate">{r.name}</span>
            </span>
            <span className="font-mono text-[13px] text-muted">
              {r.repos} {r.repos === 1 ? "repo" : "repos"}
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-2 text-[13px] text-faint">Primary language per non-fork repo, as GitHub reports it.</figcaption>
    </figure>
  );
}
