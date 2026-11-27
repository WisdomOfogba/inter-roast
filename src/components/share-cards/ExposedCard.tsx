import { C, cardRoot, F, fit, subjectLabel, Wordmark, type CardProps } from "./shared";

/** Style 2 — THE INTERNET EXPOSED ME: loud, acid, meme-forward. */
export function ExposedCard({ record, format, host }: CardProps) {
  const r = record.result;
  const story = format === "story";
  const pad = 64;
  const headline = r.headline.toUpperCase();
  const headSize = story
    ? fit(headline, [[22, 190], [32, 164], [44, 140], [58, 120]], 106)
    : fit(headline, [[22, 156], [32, 134], [44, 112], [58, 98]], 88);
  const obsLen = r.observations.join("").length + headline.length;
  const obsSize = story
    ? fit(r.observations.join(""), [[300, 46], [420, 41], [540, 36]], 32) - (headline.length > 44 ? 2 : 0)
    : fit(r.observations.join(""), [[300, 33], [420, 29], [540, 25]], 23) - (obsLen > 560 ? 1 : 0);

  return (
    <div style={cardRoot(format, { background: C.acid, color: C.ink, padding: pad })}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            background: C.ink,
            color: C.acid,
            fontFamily: F.display,
            fontSize: story ? 46 : 40,
            lineHeight: 1,
            padding: "14px 20px 10px",
            letterSpacing: "0.02em",
          }}
        >
          THE INTERNET EXPOSED ME
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 20, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "right" }}>
          {subjectLabel(record)}
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          fontFamily: F.display,
          fontSize: headSize,
          lineHeight: 0.9,
          marginTop: story ? 90 : 52,
          letterSpacing: "-0.01em",
          textWrap: "balance",
        }}
      >
        {headline}
      </div>

      {/* Identity line + score sticker */}
      <div style={{ marginTop: story ? 56 : 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 28 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: "0.1em", textTransform: "uppercase" }}>Diagnosis:</div>
          <div
            style={{
              fontFamily: F.serif,
              fontStyle: "italic",
              fontSize: fit(r.personalityTitle, [[30, story ? 72 : 62], [45, story ? 62 : 52]], story ? 54 : 46),
              lineHeight: 1.08,
              marginTop: 6,
            }}
          >
            {r.personalityTitle}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            width: story ? 220 : 170,
            height: story ? 220 : 170,
            borderRadius: "50%",
            background: C.heat,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(12deg)",
            border: `6px solid ${C.ink}`,
            color: C.ink,
          }}
        >
          <span style={{ fontFamily: F.display, fontSize: story ? 88 : 68, lineHeight: 0.85 }}>{r.roastScore.toFixed(1)}</span>
          <span style={{ fontFamily: F.mono, fontSize: story ? 18 : 15, fontWeight: 600, letterSpacing: "0.1em", marginTop: 6 }}>
            /10 {r.roastIntensity.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Observations */}
      <div style={{ marginTop: story ? 64 : 38, borderTop: `6px solid ${C.ink}`, minHeight: 0, overflow: "hidden", flexShrink: 1 }}>
        {r.observations.map((o, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 22,
              padding: story ? (obsLen > 500 ? "22px 0" : "30px 0") : obsLen > 450 ? "14px 0" : "20px 0",
              borderBottom: `2px solid ${C.ink}`,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontFamily: F.display, fontSize: story ? 60 : 50, lineHeight: 0.9, minWidth: 64 }}>0{i + 1}</span>
            <span style={{ fontFamily: F.sans, fontWeight: 500, fontSize: obsSize, lineHeight: 1.22 }}>{o}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 26 }}>
        <div>
          <Wordmark color={C.ink} size={36} />
          <div style={{ fontFamily: F.mono, fontSize: 20, marginTop: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Your turn → {host}
          </div>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 18, textAlign: "right", maxWidth: 330, lineHeight: 1.35, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Entertainment only. The receipts were self-submitted.
        </div>
      </div>

    </div>
  );
}
