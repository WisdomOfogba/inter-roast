/** RepoRiot mark: a 3×3 contribution grid where the top-right corner is on fire. */
const CELLS = ["#1f6f38", "#2ea04e", "#ff6b3d", "#11502a", "#4ac26b", "#e0531f", "#0e2a17", "#1f6f38", "#2ea04e"];

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden focusable="false">
      {CELLS.map((fill, i) => (
        <rect key={i} x={(i % 3) * 7.5} y={Math.floor(i / 3) * 7.5} width="6.5" height="6.5" rx="1.5" fill={fill} />
      ))}
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[19px] font-[750] tracking-[-0.03em] ${className}`}>
      <LogoMark />
      <span>
        Repo<span className="text-ember">Riot</span>
      </span>
    </span>
  );
}
