const UNITS: [number, Intl.RelativeTimeFormatUnit][] = [
  [365 * 86_400_000, "year"],
  [30 * 86_400_000, "month"],
  [86_400_000, "day"],
];

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const diff = now - Date.parse(iso);
  for (const [ms, unit] of UNITS) {
    if (diff >= ms) {
      const n = Math.floor(diff / ms);
      return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
    }
  }
  return "today";
}

export const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const ghRepoUrl = (login: string, repo: string) => `https://github.com/${encodeURIComponent(login)}/${encodeURIComponent(repo)}`;
