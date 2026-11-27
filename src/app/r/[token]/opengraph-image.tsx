import { ImageResponse } from "next/og";
import { decodeRecord, getSigningSecret } from "@/lib/share/token";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "A RepoRiot roast of a GitHub profile";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = decodeRecord(token, getSigningSecret());
  const fonts = await ogFonts();
  if (!record) return new ImageResponse(<OgFrame kicker="reporiot" title="This roast link doesn't check out." subtitle="Roast a profile at RepoRiot." />, { ...size, fonts });
  return new ImageResponse(
    <OgFrame
      kicker={`github.com/${record.profile.login}`}
      title={record.result.headline}
      subtitle={`Diagnosis: ${record.result.archetype}`}
      avatar={`https://avatars.githubusercontent.com/u/${record.profile.id}?s=128&v=4`}
    />,
    { ...size, fonts },
  );
}
