import localFont from "next/font/local";

/*
 * Self-hosted (SIL OFL, see src/fonts/LICENSE.md): builds need no network and
 * share-card export can embed them same-origin.
 */
export const bricolage = localFont({
  src: "../fonts/bricolage-grotesque-latin-opsz-normal.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

export const jetbrains = localFont({
  src: "../fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
});
