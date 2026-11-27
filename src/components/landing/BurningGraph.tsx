/**
 * A contribution graph that catches fire, left to right, once, on page load.
 * Deterministic (no Math.random) so server and client render identically.
 *
 * Like GitHub's own graph, cells stay square and legible (~10–18px with a 3px
 * gap): narrow screens show fewer weeks instead of shrinking cells into dots.
 */
const GREENS = ["#161b18", "#0e3a1d", "#16602f", "#2a8c45", "#4ac26b"];
const EMBERS = ["#2a1610", "#6b2510", "#b23a12", "#ff6b3d", "#ffa25e"];

function level(col: number, row: number): number {
  const n = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  const f = n - Math.floor(n);
  return f < 0.28 ? 0 : f < 0.52 ? 1 : f < 0.74 ? 2 : f < 0.9 ? 3 : 4;
}

function Grid({ cols, className }: { cols: number; className: string }) {
  const burnFrom = Math.floor(cols * 0.55);
  // Use the most recent weeks (right edge) so each tier shows the same pattern's tail.
  const offset = 53 - cols;
  return (
    <div className={`grid-flow-col grid-rows-7 gap-[3px] ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols * 7 }, (_, i) => {
        const col = Math.floor(i / 7);
        const row = i % 7;
        const lv = level(col + offset, row);
        const burns = col >= burnFrom && lv > 0;
        const style = burns
          ? ({ "--from": GREENS[lv], "--to": EMBERS[lv], backgroundColor: EMBERS[lv], animationDelay: `${300 + (col - burnFrom) * (1400 / cols) + row * 18}ms` } as React.CSSProperties)
          : { backgroundColor: GREENS[lv] };
        return <span key={i} data-cell className={`aspect-square rounded-[2px] outline outline-1 -outline-offset-1 outline-white/[0.04] lg:rounded-[3px] ${burns ? "animate-ignite" : ""}`} style={style} />;
      })}
    </div>
  );
}

export function BurningGraph({ className = "" }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Grid cols={22} className="grid sm:hidden" />
      <Grid cols={36} className="hidden sm:grid md:hidden" />
      <Grid cols={53} className="hidden md:grid" />
    </div>
  );
}
