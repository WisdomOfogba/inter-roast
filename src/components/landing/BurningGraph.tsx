/**
 * A contribution graph that catches fire, left to right, once, on page load.
 * Deterministic (no Math.random) so server and client render identically.
 */
const GREENS = ["#161b18", "#0e3a1d", "#16602f", "#2a8c45", "#4ac26b"];
const EMBERS = ["#2a1610", "#6b2510", "#b23a12", "#ff6b3d", "#ffa25e"];

function level(col: number, row: number): number {
  const n = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  const f = n - Math.floor(n);
  return f < 0.28 ? 0 : f < 0.52 ? 1 : f < 0.74 ? 2 : f < 0.9 ? 3 : 4;
}

export function BurningGraph({ cols = 53, className = "" }: { cols?: number; className?: string }) {
  const burnFrom = Math.floor(cols * 0.55);
  return (
    <div className={`grid grid-flow-col grid-rows-7 gap-[3px] ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden>
      {Array.from({ length: cols * 7 }, (_, i) => {
        const col = Math.floor(i / 7);
        const row = i % 7;
        const lv = level(col, row);
        const burns = col >= burnFrom && lv > 0;
        const style = burns
          ? ({ "--from": GREENS[lv], "--to": EMBERS[lv], backgroundColor: EMBERS[lv], animationDelay: `${300 + (col - burnFrom) * 55 + row * 18}ms` } as React.CSSProperties)
          : { backgroundColor: GREENS[lv] };
        return <span key={i} className={`aspect-square rounded-[2px] ${burns ? "animate-ignite" : ""}`} style={style} />;
      })}
    </div>
  );
}
