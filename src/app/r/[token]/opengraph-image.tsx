import { ImageResponse } from "next/og";
import { decodeRecord, getSigningSecret } from "@/lib/share/token";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "An Internet Roast result card";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = decodeRecord(token, getSigningSecret());
  const fonts = await ogFonts();
  if (!record) {
    return new ImageResponse(<OgFrame kicker="CASE NOT FOUND" title="The Roast That Wasn't" subtitle="This link doesn't check out." footer="GET ROASTED" />, { ...size, fonts });
  }
  const r = record.result;
  return new ImageResponse(
    (
      <OgFrame
        kicker={`CASE ${record.caseId}`}
        title={r.personalityTitle}
        subtitle={r.headline.length <= 70 ? `“${r.headline}”` : r.personalityDescription.slice(0, 110)}
        score={r.roastScore.toFixed(1)}
        footer={record.handle ? `SUBJECT: u/${record.handle}` : "SUBJECT: ANONYMOUS"}
      />
    ),
    { ...size, fonts },
  );
}
