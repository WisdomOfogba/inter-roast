import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "RepoRiot: your GitHub has some explaining to do.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <OgFrame kicker="reporiot" title="Your GitHub has some explaining to do." subtitle="Paste a profile. Get a code review of the developer behind it." />,
    { ...size, fonts: await ogFonts() },
  );
}
