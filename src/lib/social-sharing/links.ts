export function shareText(archetype: string, headline: string): string {
  return `RepoRiot reviewed my GitHub and diagnosed me as "${archetype}". ${headline}`;
}

export function xShareUrl(text: string, url: string): string {
  return `https://x.com/intent/tweet?${new URLSearchParams({ text, url }).toString()}`;
}

export function linkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url }).toString()}`;
}

export function siteHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "reporiot.app";
  }
}
