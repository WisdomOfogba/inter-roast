import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

const fontFile = (name: string) => readFile(join(process.cwd(), "src/fonts", name));

export async function ogFonts() {
  const [anton, archivo, mono, serif] = await Promise.all([
    fontFile("anton-latin-400-normal.woff"),
    fontFile("archivo-latin-500-normal.woff"),
    fontFile("ibm-plex-mono-latin-500-normal.woff"),
    fontFile("instrument-serif-latin-400-italic.woff"),
  ]);
  return [
    { name: "Anton", data: anton, weight: 400 as const, style: "normal" as const },
    { name: "Archivo", data: archivo, weight: 500 as const, style: "normal" as const },
    { name: "Plex Mono", data: mono, weight: 500 as const, style: "normal" as const },
    { name: "Instrument Serif", data: serif, weight: 400 as const, style: "italic" as const },
  ];
}

const C = { ink: "#0d0d0c", paper: "#f2eee5", acid: "#e4ff3a", heat: "#ff3b1f", stone: "#a39d90" };

export function OgFrame({ kicker, title, subtitle, score, footer }: { kicker: string; title: string; subtitle: string; score?: string; footer: string }) {
  const titleSize = title.length <= 20 ? 116 : title.length <= 30 ? 96 : title.length <= 42 ? 80 : 66;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.ink, color: C.paper, padding: 60, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", fontFamily: "Anton", fontSize: 34 }}>
          <div style={{ width: 20, height: 20, background: C.heat, transform: "rotate(45deg)", marginRight: 14 }} />
          INTERNET ROAST
        </div>
        <div style={{ display: "flex", fontFamily: "Plex Mono", fontSize: 20, color: C.stone, letterSpacing: 2 }}>{kicker}</div>
      </div>
      <div style={{ display: "flex", height: 6, background: C.paper, marginTop: 22 }} />
      <div style={{ display: "flex", fontFamily: "Plex Mono", fontSize: 22, color: C.acid, marginTop: 40, letterSpacing: 3 }}>YOUR INTERNET PERSONALITY IS</div>
      <div style={{ display: "flex", fontFamily: "Anton", fontSize: titleSize, lineHeight: 0.95, marginTop: 14, maxWidth: score ? 860 : 1080 }}>{title.toUpperCase()}</div>
      <div style={{ display: "flex", fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: 40, color: "#d6cfc0", marginTop: 22, maxWidth: 900, lineHeight: 1.1 }}>{subtitle}</div>
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Plex Mono", fontSize: 20, color: C.stone, letterSpacing: 1 }}>
        <span>{footer}</span>
        <span>FOR ENTERTAINMENT. NOT A PSYCH EVAL.</span>
      </div>
      {score && (
        <div style={{ position: "absolute", right: 60, top: 150, width: 210, height: 210, borderRadius: 105, background: C.heat, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(10deg)", color: C.ink }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 92, lineHeight: 0.9 }}>{score}</div>
          <div style={{ display: "flex", fontFamily: "Plex Mono", fontSize: 18 }}>/10 ROASTED</div>
        </div>
      )}
    </div>
  );
}
