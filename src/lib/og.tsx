import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };
const font = (n: string) => readFile(join(process.cwd(), "src/fonts", n));

export async function ogFonts() {
  const [b400, b800, mono] = await Promise.all([
    font("bricolage-grotesque-latin-400-normal.woff"),
    font("bricolage-grotesque-latin-800-normal.woff"),
    font("jetbrains-mono-latin-500-normal.woff"),
  ]);
  return [
    { name: "Bricolage", data: b400, weight: 400 as const, style: "normal" as const },
    { name: "Bricolage", data: b800, weight: 800 as const, style: "normal" as const },
    { name: "JetBrains", data: mono, weight: 500 as const, style: "normal" as const },
  ];
}

const GREENS = ["#161b18", "#0e3a1d", "#16602f", "#2a8c45", "#4ac26b"];
const EMBERS = ["#2a1610", "#6b2510", "#b23a12", "#ff6b3d", "#ffa25e"];
function lv(c: number, r: number) {
  const n = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
  const f = n - Math.floor(n);
  return f < 0.28 ? 0 : f < 0.52 ? 1 : f < 0.74 ? 2 : f < 0.9 ? 3 : 4;
}

export function OgFrame({ title, subtitle, kicker, avatar }: { title: string; subtitle: string; kicker: string; avatar?: string }) {
  const size = title.length <= 40 ? 76 : title.length <= 70 ? 62 : 52;
  const cols = 26;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0e1110", color: "#eceeea", padding: 60, fontFamily: "Bricolage" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {avatar && <img src={avatar} width={64} height={64} style={{ borderRadius: 32 }} alt="" />}
        <div style={{ display: "flex", fontFamily: "JetBrains", fontSize: 24, color: "#959e98" }}>{kicker}</div>
      </div>
      <div style={{ display: "flex", fontSize: size, fontWeight: 800, letterSpacing: -2, lineHeight: 1.04, marginTop: 34, maxWidth: 1060 }}>{title}</div>
      <div style={{ display: "flex", fontSize: 30, color: "#959e98", marginTop: 20, maxWidth: 1000 }}>{subtitle}</div>
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {Array.from({ length: 7 }, (_, r) => {
                const l = lv(c, r);
                return <div key={r} style={{ width: 11, height: 11, borderRadius: 2, background: c >= cols / 2 && l > 0 ? EMBERS[l] : GREENS[l] }} />;
              })}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
          Repo<span style={{ color: "#ff6b3d" }}>Riot</span>
        </div>
      </div>
    </div>
  );
}
