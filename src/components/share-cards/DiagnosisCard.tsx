import { C, cardRoot, F, fit, formatDate, ScoreBar, subjectLabel, type CardProps } from "./shared";

/** Style 3 — THE PERSONALITY DIAGNOSIS: a mock clinical printout. */
export function DiagnosisCard({ record, format, host }: CardProps) {
  const r = record.result;
  const story = format === "story";
  const pad = 64;
  const title = r.personalityTitle.toUpperCase();
  const titleSize = story
    ? fit(title, [[18, 136], [26, 116], [36, 98], [48, 84]], 74)
    : fit(title, [[18, 112], [26, 96], [36, 82], [48, 70]], 62);
  const mono = { fontFamily: F.mono, letterSpacing: "0.06em", textTransform: "uppercase" as const };
  const label = { ...mono, fontSize: 19, color: C.stoneLight };
  const line = `2px dashed ${C.ink3}`;

  const traits = r.personalityTraits.slice(0, story ? 5 : 3);

  return (
    <div
      style={cardRoot(format, {
        background: C.ink,
        color: C.paper,
        padding: pad,
        backgroundImage: `linear-gradient(${C.ink2} 2px, transparent 2px), linear-gradient(90deg, ${C.ink2} 2px, transparent 2px)`,
        backgroundSize: "54px 54px",
        backgroundPosition: "-2px -2px",
      })}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", ...mono, fontSize: 20 }}>
        <div>
          <div style={{ color: C.acid, fontWeight: 600 }}>Internet Roast · Dept. of Online Behaviour</div>
          <div style={{ color: C.stoneLight, marginTop: 6 }}>Form {record.caseId} · {formatDate(record.createdAt)}</div>
        </div>
        <div style={{ border: `2px solid ${C.paper}`, padding: "6px 12px" }}>Confidential-ish</div>
      </div>

      <div style={{ fontFamily: F.display, fontSize: story ? 92 : 64, lineHeight: 0.9, marginTop: story ? 56 : 28, letterSpacing: "0.005em" }}>
        PERSONALITY<br />DIAGNOSIS
      </div>

      {/* Patient & diagnosis */}
      <div style={{ marginTop: story ? 48 : 22, borderTop: line, paddingTop: story ? 20 : 16, display: "flex", gap: 40 }}>
        <div><div style={label}>Patient</div><div style={{ ...mono, fontSize: 26, marginTop: 6 }}>{subjectLabel(record)}</div></div>
        <div><div style={label}>Severity</div><div style={{ ...mono, fontSize: 26, marginTop: 6, color: C.heat, fontWeight: 600 }}>{r.roastIntensity}</div></div>
      </div>

      <div style={{ marginTop: story ? 40 : 18 }}>
        <div style={label}>Primary diagnosis</div>
        <div style={{ fontFamily: F.display, fontSize: titleSize, lineHeight: 0.94, marginTop: 10, color: C.acid, textWrap: "balance" }}>{title}</div>
        <div style={{ ...mono, fontSize: 21, marginTop: 14, color: C.bone }}>Class: {r.behaviourClass}</div>
      </div>

      {/* Indicators */}
      <div style={{ marginTop: story ? 48 : 22, borderTop: line, paddingTop: story ? 20 : 16 }}>
        <div style={label}>Behaviour indicators</div>
        {r.indicators.map((ind, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, marginTop: story ? 20 : 10 }}>
            <span style={{ ...mono, fontSize: 23, flex: 1 }}>{ind.label}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {Array.from({ length: 5 }, (_, k) => (
                <div key={k} style={{ width: 34, height: 26, background: k < ind.level ? C.heat : "transparent", border: `2px solid ${k < ind.level ? C.heat : C.ink3}` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Traits checklist */}
      <div style={{ marginTop: story ? 44 : 20, borderTop: line, paddingTop: story ? 20 : 16, display: "flex", flexWrap: "wrap", gap: story ? "12px 34px" : "8px 30px" }}>
        <div style={{ ...label, width: "100%" }}>Presenting symptoms</div>
        {traits.map((t) => (
          <span key={t} style={{ ...mono, fontSize: 22, textTransform: "none", letterSpacing: "0.02em" }}>
            <span style={{ color: C.acid }}>[x]</span> {t}
          </span>
        ))}
      </div>

      {/* Prescription */}
      <div style={{ marginTop: story ? 44 : 20, borderTop: line, paddingTop: story ? 20 : 16, flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
        <div style={label}>Prescription</div>
        <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: story ? fit(r.closingStatement, [[100, 60], [150, 54]], 48) : fit(r.closingStatement, [[90, 44], [140, 39]], 35), lineHeight: 1.15, marginTop: 10 }}>
          {r.closingStatement}
        </div>
        {story && r.closingStatement.length + r.personalityDescription.length < 300 && (
          <div style={{ fontFamily: F.sans, fontSize: 32, lineHeight: 1.35, marginTop: 30, color: C.bone }}>{r.personalityDescription}</div>
        )}
      </div>

      {/* Rating */}
      <div style={{ borderTop: line, paddingTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...mono, fontSize: 20, marginBottom: 12 }}>
          <span>Roast rating</span>
          <span style={{ color: C.acid, fontWeight: 600 }}>{r.roastScore.toFixed(1)} / 10</span>
        </div>
        <ScoreBar score={r.roastScore} on={C.acid} off={C.ink3} height={20} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, ...mono, fontSize: 17, color: C.stoneLight }}>
          <span>Not a medical or psychological assessment. It&apos;s a joke.</span>
          <span style={{ color: C.paper }}>{host}</span>
        </div>
      </div>

      {/* Stamp */}
      <div
        style={{
          position: "absolute",
          right: 60,
          top: story ? 250 : 150,
          border: `6px double ${C.heat}`,
          color: C.heat,
          fontFamily: F.display,
          fontSize: story ? 54 : 46,
          lineHeight: 1,
          padding: "12px 18px 8px",
          transform: "rotate(8deg)",
          letterSpacing: "0.05em",
        }}
      >
        CONFIRMED
      </div>
    </div>
  );
}
