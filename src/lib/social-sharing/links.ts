export function shareText(title: string, score: number): string {
  return `The internet roasted me: I'm "${title}" (${score.toFixed(1)}/10 roast rating). Your turn.`;
}

export function xShareUrl(text: string, url: string): string {
  const p = new URLSearchParams({ text, url });
  return `https://x.com/intent/tweet?${p.toString()}`;
}

export function whatsappShareUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function siteHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "internetroast.app";
  }
}
