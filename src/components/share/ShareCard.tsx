import type { CSSProperties } from "react";
import type { RoastRecord } from "@/types/roast";

export type CardFormat = "landscape" | "portrait";
export const CARD_SIZES: Record<CardFormat, { width: number; height: number; label: string }> = {
  landscape: { width: 1200, height: 630, label: "X / LinkedIn 1200×630" },
  portrait: { width: 1080, height: 1350, label: "Feed 1080×1350" },
};

const C = { canvas: "#0e1110", panel: "#151917", line: "#262c29", fg: "#eceeea", muted: "#959e98", faint: "#66706a", ember: "#ff6b3d", commit: "#4ac26b" };
const F = { sans: "var(--font-bricolage), system-ui, sans-serif", mono: "var(--font-jetbrains), ui-monospace, monospace" };
const GREENS = ["#161b18", "#0e3a1d", "#16602f", "#2a8c45", "#4ac26b"];
const EMBERS = ["#2a1610", "#6b2510", "#b23a12", "#ff6b3d", "#ffa25e"];

function cellLevel(c: number, r: number) {
  const n = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
  const f = n - Math.floor(n);
  return f < 0.28 ? 0 : f < 0.52 ? 1 : f < 0.74 ? 2 : f < 0.9 ? 3 : 4;
}

/** Static (export-safe) version of the burning graph. */
function Strip({ cols, cell, gap }: { cols: number; cell: number; gap: number }) {
  const burnFrom = Math.floor(cols * 0.5);
  return (
    <div style={{ display: "grid", gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoFlow: "column", gridAutoColumns: `${cell}px`, gap }}>
      {Array.from({ length: cols * 7 }, (_, i) => {
        const c = Math.floor(i / 7);
        const lv = cellLevel(c, i % 7);
        return <span key={i} style={{ width: cell, height: cell, borderRadius: 2, background: c >= burnFrom && lv > 0 ? EMBERS[lv] : GREENS[lv] }} />;
      })}
    </div>
  );
}

function fit(text: string, ladder: [number, number][], min: number) {
  for (const [max, size] of ladder) if (text.length <= max) return size;
  return min;
}

export function ShareCard({ record, format, host, avatarSrc }: { record: RoastRecord; format: CardFormat; host: string; avatarSrc?: string | null }) {
  const { width, height } = CARD_SIZES[format];
  const r = record.result;
  const p = record.profile;
  const portrait = format === "portrait";
  const headSize = portrait ? fit(r.headline, [[40, 96], [60, 84], [80, 72]], 62) : fit(r.headline, [[40, 92], [60, 78], [80, 66]], 58);
  const avatar = avatarSrc === undefined ? `/api/avatar/${p.id}` : avatarSrc;
  const verdict = record.intensity === "mild" ? "Approved with comments" : "Changes requested";
  const root: CSSProperties = {
    width, height, background: C.canvas, color: C.fg, fontFamily: F.sans, display: "flex", flexDirection: "column",
    padding: portrait ? 72 : 56, boxSizing: "border-box", position: "relative", overflow: "hidden",
  };

  return (
    <div style={root}>
      {/* identity row */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" width={portrait ? 96 : 72} height={portrait ? 96 : 72} style={{ borderRadius: "50%", border: `2px solid ${C.line}` }} />
        ) : (
          <div style={{ width: portrait ? 96 : 72, height: portrait ? 96 : 72, borderRadius: "50%", background: C.panel, display: "grid", placeItems: "center", fontSize: 30, color: C.muted, fontWeight: 700 }}>
            {p.login.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: portrait ? 36 : 30, fontWeight: 700, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: portrait ? 760 : 640 }}>
            {p.name ?? p.login}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: portrait ? 24 : 20, color: C.muted, marginTop: 4 }}>github.com/{p.login}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 999, background: "rgba(255,107,61,.14)", color: C.ember, fontSize: portrait ? 22 : 18, fontWeight: 700, whiteSpace: "nowrap" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: C.ember }} />
          {verdict}
        </div>
      </div>

      {/* headline */}
      <div style={{ marginTop: portrait ? 72 : 40, fontSize: headSize, fontWeight: 720, letterSpacing: "-0.024em", lineHeight: 1.04, fontVariationSettings: '"opsz" 96', textWrap: "balance" }}>
        {r.headline}
      </div>
      <div style={{ marginTop: portrait ? 28 : 18, fontSize: portrait ? 30 : 24, color: C.muted }}>
        Diagnosis: <span style={{ color: C.fg, fontWeight: 650 }}>{r.archetype}</span>
      </div>

      {portrait && (
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 18 }}>
          {r.comments.slice(0, 3).map((c, i) => (
            <div key={i} style={{ border: `2px solid ${C.line}`, borderRadius: 14, padding: "20px 24px", background: C.panel }}>
              <div style={{ fontSize: 30, fontWeight: 650, letterSpacing: "-0.015em", lineHeight: 1.2 }}>{c.title}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* footer */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
        <div>
          <Strip cols={portrait ? 22 : 18} cell={portrait ? 14 : 11} gap={3} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: portrait ? 40 : 32, fontWeight: 760, letterSpacing: "-0.03em" }}>
            Repo<span style={{ color: C.ember }}>Riot</span>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: portrait ? 22 : 18, color: C.muted, marginTop: 6 }}>Roast yours at {host}</div>
        </div>
      </div>
    </div>
  );
}
