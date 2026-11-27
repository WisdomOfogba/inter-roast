/** A static map of what RepoRiot reads. Descriptive only, never a progress display. */
const ROWS: [string, string, string][] = [
  ["├─", "profile", "bio, followers"],
  ["├─", "repos/", "100 most recent"],
  ["│  ├─", "README.md", "up to 5"],
  ["│  └─", "commits", "recent messages"],
  ["├─", "events", "last 90 days"],
  ["└─", "pinned", "needs a token"],
];

export function ReadTree() {
  return (
    <div className="rounded-xl border border-line bg-panel/50 p-5 font-mono text-[13.5px] leading-7">
      <p className="text-muted">What we read</p>
      <p className="mt-3 text-fg">github.com/you</p>
      <ul>
        {ROWS.map(([branch, name, note]) => (
          <li key={name} className="flex gap-2 whitespace-nowrap">
            <span aria-hidden className="text-faint">{branch}</span>
            <span className="text-fg">{name}</span>
            <span className="truncate text-faint">{note}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-4 font-sans text-[14px] leading-relaxed text-muted">Private repos and private contributions are invisible to us, so they&apos;re never part of the roast.</p>
    </div>
  );
}
