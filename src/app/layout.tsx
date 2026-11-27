import type { Metadata, Viewport } from "next";
import { anton, archivo, instrument, plexMono } from "./fonts";
import { SITE_NAME, siteUrl, TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — ${TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Drop your Reddit receipts and get a personalised roast of your internet personality, plus a share card your friends will screenshot.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: "Find out your internet personality. Get roasted accordingly.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${instrument.variable} ${archivo.variable} ${plexMono.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-acid focus:px-3 focus:py-2 focus:font-mono focus:text-sm"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
