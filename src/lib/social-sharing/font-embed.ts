/**
 * Build @font-face CSS with fonts inlined as data URLs, for html-to-image.
 *
 * Why not html-to-image's own getFontEmbedCSS? It decides which fonts are
 * "used" by reading `element.style.fontFamily` before the computed style, so
 * inline `var(--font-…)` values never match a @font-face and the fonts are
 * silently dropped (exports fall back to Times). We embed every same-origin
 * web font on the page instead: there are only a handful and they're small.
 */
let cached: Promise<string> | null = null;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function build(): Promise<string> {
  const rules: CSSFontFaceRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue; // cross-origin sheet
    }
    for (const rule of Array.from(list)) if (rule instanceof CSSFontFaceRule) rules.push(rule);
  }

  const out = await Promise.all(
    rules.map(async (rule) => {
      const src = rule.style.getPropertyValue("src");
      const m = src.match(/url\(["']?([^"')]+)["']?\)/);
      if (!m) return ""; // local() fallbacks aren't needed
      const base = rule.parentStyleSheet?.href ?? location.href;
      const url = new URL(m[1], base);
      if (url.origin !== location.origin) return "";
      const res = await fetch(url);
      if (!res.ok) return "";
      const dataUrl = await blobToDataUrl(await res.blob());
      return rule.cssText.replace(m[0], `url("${dataUrl}")`);
    }),
  );
  return out.filter(Boolean).join("\n");
}

export function getEmbeddedFontCSS(): Promise<string> {
  cached ??= build().catch((e) => {
    cached = null;
    throw e;
  });
  return cached;
}
