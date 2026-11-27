import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "Internet Roast: the internet has receipts. Let's use them.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <OgFrame kicker="VOL. 01 · REDDIT EDITION" title="The Internet Has Receipts." subtitle="Let's see what your digital personality says about you." footer="PASTE YOUR POSTS. GET ROASTED." />,
    { ...size, fonts: await ogFonts() },
  );
}
