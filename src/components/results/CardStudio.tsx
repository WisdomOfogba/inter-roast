"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Check, Download, Link2, LoaderCircle, Share2 } from "lucide-react";
import type { RoastRecord } from "@/types/roast";
import { CARD_SIZES, CARD_STYLES, RoastCard, type CardFormat, type CardStyle } from "@/components/share-cards";
import { ScaledCard } from "@/components/share-cards/ScaledCard";
import { shareText, whatsappShareUrl, xShareUrl } from "@/lib/social-sharing/links";
import { getEmbeddedFontCSS } from "@/lib/social-sharing/font-embed";

type Busy = null | "download" | "share";

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41" />
    </svg>
  );
}

const isSafari = () => typeof navigator !== "undefined" && /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

export function CardStudio({ record, shareUrl, host }: { record: RoastRecord; shareUrl: string; host: string }) {
  const [style, setStyle] = useState<CardStyle>("report");
  const [format, setFormat] = useState<CardFormat>("post");
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  /** Unscaled, off-screen copy used for export: avoids layout drift from the preview's scale transform. */
  const exportRef = useRef<HTMLDivElement>(null);

  const text = shareText(record.result.personalityTitle, record.result.roastScore);
  const fileName = `internet-roast-${style}-${format}.png`;

  useEffect(() => {
    // Feature detection must happen after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const render = useCallback(async (): Promise<Blob> => {
    const node = exportRef.current?.firstElementChild as HTMLElement | null;
    if (!node) throw new Error("Card not mounted");
    await document.fonts.ready;
    const { width, height } = CARD_SIZES[format];
    const fontEmbedCSS = await getEmbeddedFontCSS();
    const opts = { width, height, pixelRatio: 1, cacheBust: true, fontEmbedCSS, backgroundColor: undefined };
    // Safari sometimes paints fonts on the second pass only.
    if (isSafari()) await toBlob(node, opts);
    const blob = await toBlob(node, opts);
    if (!blob) throw new Error("Export produced no image");
    return blob;
  }, [format]);

  const download = async () => {
    setBusy("download");
    setStatus("Rendering your card…");
    try {
      const blob = await render();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setStatus(`Saved ${fileName} (${CARD_SIZES[format].width}×${CARD_SIZES[format].height}).`);
    } catch {
      setStatus("Couldn't render the image. Try again, or screenshot the preview.");
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setStatus("Link copied. Go ruin someone's day.");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setStatus("Couldn't access the clipboard. Long-press the address bar to copy instead.");
    }
  };

  const nativeShare = async () => {
    setBusy("share");
    try {
      let shared = false;
      try {
        const blob = await render();
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "Internet Roast", text: `${text} ${shareUrl}` });
          shared = true;
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
      if (!shared) await navigator.share({ title: "Internet Roast", text, url: shareUrl });
      setStatus("Shared. No take-backs.");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setStatus("Sharing isn't available here. Copy the link instead.");
    } finally {
      setBusy(null);
    }
  };

  const btn =
    "inline-flex min-h-12 items-center justify-center gap-2 border-2 border-ink px-4 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] transition-[transform,background] active:translate-y-px disabled:opacity-60";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
      {/* Controls */}
      <div className="order-2 lg:order-1">
        <fieldset>
          <legend className="font-mono text-xs uppercase tracking-[0.14em] text-stone">01 — Pick a card</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Card style">
            {CARD_STYLES.map((s) => {
              const active = s.id === style;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStyle(s.id)}
                  className={`min-h-16 border-2 border-ink px-4 py-3 text-left transition-colors ${active ? "bg-ink text-paper" : "bg-paper hover:bg-paper-2"}`}
                >
                  <span className="block font-display text-xl leading-none tracking-wide uppercase">{s.name}</span>
                  <span className={`mt-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] ${active ? "text-bone" : "text-stone"}`}>{s.blurb}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="font-mono text-xs uppercase tracking-[0.14em] text-stone">02 — Pick a size</legend>
          <div className="mt-3 inline-flex border-2 border-ink" role="radiogroup" aria-label="Card size">
            {(Object.keys(CARD_SIZES) as CardFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={f === format}
                onClick={() => setFormat(f)}
                className={`min-h-12 px-5 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] ${f === format ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
              >
                {CARD_SIZES[f].label}
                <span className="ml-2 font-normal opacity-60">{CARD_SIZES[f].width}×{CARD_SIZES[f].height}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-7">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-stone">03 — Spread it</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button type="button" onClick={download} disabled={busy !== null} className={`${btn} col-span-2 border-heat bg-heat text-ink hover:bg-[#ff5a42] sm:col-span-1`}>
              {busy === "download" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
              Download PNG
            </button>
            {canNativeShare && (
              <button type="button" onClick={nativeShare} disabled={busy !== null} className={`${btn} col-span-2 bg-ink text-paper sm:col-span-1`}>
                {busy === "share" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
                Share
              </button>
            )}
            <button type="button" onClick={copyLink} className={`${btn} bg-paper hover:bg-paper-2`}>
              {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <a href={xShareUrl(text, shareUrl)} target="_blank" rel="noopener noreferrer" className={`${btn} bg-paper hover:bg-paper-2`}>
              <XLogo /> Post on X
            </a>
            <a href={whatsappShareUrl(text, shareUrl)} target="_blank" rel="noopener noreferrer" className={`${btn} col-span-2 bg-paper hover:bg-paper-2 sm:col-span-1`}>
              <WhatsAppLogo /> WhatsApp
            </a>
          </div>
          <p className="mt-4 min-h-6 font-mono text-[13px] text-stone" role="status" aria-live="polite">
            {status}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-stone">
            Instagram Stories: download the 9:16 card (or use Share on your phone) and add it as a sticker. The link holds the roast, not your pasted posts.
          </p>
        </div>
      </div>

      {/* Export source: full size, off-screen, never transformed. */}
      <div aria-hidden style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}>
        <div ref={exportRef}>
          <RoastCard style={style} format={format} record={record} host={host} />
        </div>
      </div>

      {/* Preview */}
      <div className="order-1 lg:order-2">
        <div className={`mx-auto ${format === "story" ? "max-w-[300px] sm:max-w-[340px]" : "max-w-[420px]"}`}>
          <div className="shadow-[10px_10px_0_0_#0d0d0c] border-2 border-ink">
            <ScaledCard format={format} label={`Preview of the ${CARD_STYLES.find((s) => s.id === style)?.name} card`}>
              <RoastCard style={style} format={format} record={record} host={host} />
            </ScaledCard>
          </div>
          <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-stone">
            Live preview · exports at full {CARD_SIZES[format].width}×{CARD_SIZES[format].height}
          </p>
        </div>
      </div>
    </div>
  );
}
