import localFont from "next/font/local";

/*
 * Fonts are self-hosted (SIL Open Font License, see src/fonts/LICENSE.md) so
 * builds need no network, and html-to-image can embed them same-origin.
 */
export const anton = localFont({
  src: "../fonts/anton-latin-400-normal.woff2",
  variable: "--font-anton",
  display: "swap",
  weight: "400",
});

export const instrument = localFont({
  src: "../fonts/instrument-serif-latin-400-italic.woff2",
  variable: "--font-instrument",
  display: "swap",
  style: "italic",
  weight: "400",
});

export const archivo = localFont({
  src: [
    { path: "../fonts/archivo-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/archivo-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/archivo-latin-700-normal.woff2", weight: "700" },
    { path: "../fonts/archivo-latin-800-normal.woff2", weight: "800" },
  ],
  variable: "--font-archivo",
  display: "swap",
});

export const plexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/ibm-plex-mono-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});
