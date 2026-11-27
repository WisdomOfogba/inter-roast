import { C, cardRoot, F, fit, formatDate, ScoreBar, subjectLabel, Wordmark, type CardProps } from "./shared";

/** Style 1 — THE OFFICIAL ROAST REPORT: editorial black-and-white. */
export function ReportCard({ record, format, host }: CardProps) {
  const r = record.result;
  const story = format === "story";
  const pad = 72;
  const title = r.personalityTitle.toUpperCase();
  const titleSize = story
    ? fit(title, [[18, 168], [26, 140], [36, 118], [48, 100]], 88)
    : fit(title, [[18, 140], [26, 118], [36, 98], [48, 84]], 74);
  const roastSize = story
    ? fit(r.mainRoast, [[300, 60], [450, 54], [600, 48], [750, 43]], 40)
    : fit(r.mainRoast, [[300, 52], [450, 46], [600, 41], [750, 37]], 34);

  const rule = (h: number) => <div style={{ height: h, background: C.ink, width: "100%" }} />;
  const mono = { fontFamily: F.mono, fontSize: 22, letterSpacing: "0.08em", textTransform: "uppercase" as const };

  return (
    <div style={cardRoot(format, { background: C.paper, color: C.ink, padding: pad })}>
      {/* Masthead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark color={C.ink} size={34} />
        <div style={{ ...mono, fontSize: 20 }}>Case {record.caseId}</div>
      </div>
      <div style={{ marginTop: 22 }}>{rule(10)}</div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", ...mono, fontSize: 19 }}>
        <span>The Official Roast Report</span>
        <span>{formatDate(record.createdAt)}</span>
      </div>
      {rule(2)}

      {/* Subject + classification */}
      <div style={{ marginTop: story ? 64 : 36, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
        <div>
          <div style={{ ...mono, color: C.stone }}>Subject: {subjectLabel(record)}</div>
          <div style={{ marginTop: 14, ...mono, fontSize: 20 }}>Internet personality classification</div>
        </div>
        <div
          style={{
            border: `6px solid ${C.heat}`,
            color: C.heat,
            fontFamily: F.display,
            fontSize: 40,
            lineHeight: 1,
            padding: "12px 18px 8px",
            transform: "rotate(-7deg)",
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          ROASTED
        </div>
      </div>
      <div
        style={{
          fontFamily: F.display,
          fontSize: titleSize,
          lineHeight: 0.92,
          marginTop: 14,
          letterSpacing: "-0.005em",
          textWrap: "balance",
        }}
      >
        {title}
      </div>

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 32, marginTop: story ? 56 : 34 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: F.display, fontSize: story ? 150 : 118, lineHeight: 0.8 }}>{r.roastScore.toFixed(1)}</span>
          <span style={{ ...mono, fontSize: 22 }}>/10</span>
        </div>
        <div style={{ flex: 1, paddingBottom: 6 }}>
          <div style={{ ...mono, fontSize: 18, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
            <span>Roast intensity</span>
            <span style={{ color: C.heat, fontWeight: 600 }}>{r.roastIntensity}</span>
          </div>
          <ScoreBar score={r.roastScore} on={C.ink} off={C.bone} height={story ? 28 : 22} />
        </div>
      </div>

      {/* Main roast */}
      <div style={{ marginTop: story ? 56 : 36 }}>{rule(2)}</div>
      <div
        style={{
          fontFamily: F.serif,
          fontStyle: "italic",
          fontSize: roastSize,
          lineHeight: 1.18,
          marginTop: story ? 44 : 30,
          flex: story ? "0 0 auto" : "1 1 0",
          minHeight: 0,
          overflow: story ? "visible" : "hidden",
        }}
      >
        “{r.mainRoast}”
      </div>

      {story && (
        <>
          <div style={{ marginTop: 44, ...mono, fontSize: 20, color: C.stone, flexShrink: 0 }}>Closing statement</div>
          <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: fit(r.closingStatement, [[80, 44], [130, 38]], 33), lineHeight: 1.1, marginTop: 12, flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
            <span style={{ background: C.acid, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", padding: "0 8px" }}>{r.closingStatement}</span>
          </div>
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: 28 }}>{rule(10)}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 18, ...mono, fontSize: 19 }}>
        <span style={{ fontWeight: 600 }}>Get roasted → {host}</span>
        <span style={{ color: C.stone }}>For entertainment. Not a psych eval.</span>
      </div>

    </div>
  );
}
