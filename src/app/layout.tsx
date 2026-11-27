import type { Metadata, Viewport } from "next";
import { bricolage, jetbrains } from "./fonts";
import { SITE_NAME, siteUrl, TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME}: ${TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: "Paste a GitHub profile. RepoRiot reads the public repos, READMEs and commit messages, then roasts the developer behind them.",
  openGraph: { type: "website", siteName: SITE_NAME, title: `${SITE_NAME}: ${TAGLINE}`, description: "Your GitHub has some explaining to do." },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0e1110", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${jetbrains.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-commit focus:px-3 focus:py-2 focus:text-commit-ink">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
