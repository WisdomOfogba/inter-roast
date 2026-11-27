"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toBlob } from "html-to-image";
import { Check, Copy, Download, Link2, LoaderCircle, RotateCcw, Share2 } from "lucide-react";
import type { RoastRecord } from "@/types/roast";
import { CATEGORY_LABEL } from "@/types/roast";
import { ShareCard, CARD_SIZES, type CardFormat } from "./ShareCard";
import { ScaledCard } from "./ScaledCard";
import { getEmbeddedFontCSS } from "@/lib/social-sharing/font-embed";
import { linkedInShareUrl, shareText, xShareUrl } from "@/lib/social-sharing/links";

const isSafari = () => /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

export function roastAsText(record: RoastRecord, url: string): string {
  const r = record.result;
  return [
    `${r.headline}`,
    `Diagnosis: ${r.archetype} (@${record.profile.login})`,
    "",
    r.mainRoast,
    "",
    ...r.comments.map((c) => `- ${CATEGORY_LABEL[c.category]}: ${c.title}. ${c.roast}`),
    "",
    r.closingLine,
    "",
    `Roasted by RepoRiot: ${url}`,
  ].join("\n");
}

export function SharePanel({ record, shareUrl, host }: { record: RoastRecord; shareUrl: string; host: string }) {
  const [format, setFormat] = useState<CardFormat>("landscape");
  const [busy, setBusy] = useState<null | "download" | "share">(null);
  const [copied, setCopied] = useState<null | "text" | "link">(null);
  const [status, setStatus] = useState("");
  const [canShare, setCanShare] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const text = shareText(record.result.archetype, record.result.headline);
  const fileName = `reporiot-${record.profile.login}-${format}.png`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator.share === "function");
  }, []);

  const render = async (): Promise<Blob> => {
    const node = exportRef.current?.firstElementChild as HTMLElement | null;
    if (!node) throw new Error("not mounted");
    await document.fonts.ready;
    const { width, height } = CARD_SIZES[format];
    const opts = { width, height, pixelRatio: 1, cacheBust: true, fontEmbedCSS: await getEmbeddedFontCSS() };
    if (isSafari()) await toBlob(node, opts);
    const blob = await toBlob(node, opts);
    if (!blob) throw new Error("empty");
    return blob;
  };

  const download = async () => {
    setBusy("download");
    setStatus("Rendering the image…");
    try {
      const blob = await render();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setStatus(`Saved ${fileName}.`);
    } catch {
      setStatus("The image didn't render. Try again, or take a screenshot of the preview.");
    } finally {
      setBusy(null);
    }
  };

  const copy = async (what: "text" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "text" ? roastAsText(record, shareUrl) : shareUrl);
      setCopied(what);
      setStatus(what === "text" ? "Roast copied as text." : "Link copied.");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setStatus("Clipboard access was blocked by the browser.");
    }
  };

  const share = async () => {
    setBusy("share");
    try {
      let done = false;
      try {
        const file = new File([await render()], fileName, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: `${text} ${shareUrl}` });
          done = true;
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
      if (!done) await navigator.share({ title: "RepoRiot", text, url: shareUrl });
      setStatus("Shared.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus("Sharing isn't available here. Copy the link instead.");
    } finally {
      setBusy(null);
    }
  };

  const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line-strong px-4 text-[15px] font-medium transition-colors hover:bg-panel-2 disabled:opacity-60";
  const { width, height } = CARD_SIZES[format];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">
      <div className="order-2 lg:order-1">
        <h2 id="share" className="display text-[clamp(1.6rem,4vw,2.5rem)]">Share the damage</h2>
        <p className="mt-2 max-w-md text-[16px] leading-relaxed text-muted sm:text-[17px]">
          The link opens this exact roast. The image is made for X, LinkedIn and group chats.
          <a href="#roast-content" className="ml-1 text-commit underline-offset-4 hover:underline lg:hidden">Read the full roast</a>
        </p>

        <div className="mt-6 inline-flex rounded-lg border border-line bg-panel p-1" role="radiogroup" aria-label="Image size">
          {(Object.keys(CARD_SIZES) as CardFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={f === format}
              onClick={() => setFormat(f)}
              className={`min-h-10 rounded-md px-3 text-[14px] font-medium ${f === format ? "bg-panel-2 text-fg ring-1 ring-line-strong" : "text-muted hover:text-fg"}`}
            >
              {CARD_SIZES[f].label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" onClick={download} disabled={!!busy} className={`${btn} col-span-2 border-commit bg-commit font-semibold text-commit-ink hover:bg-commit-hover sm:col-span-1`}>
            {busy === "download" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
            Download image
          </button>
          {canShare && (
            <button type="button" onClick={share} disabled={!!busy} className={`${btn} col-span-2 sm:col-span-1`}>
              {busy === "share" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
              Share
            </button>
          )}
          <button type="button" onClick={() => copy("link")} className={btn}>
            {copied === "link" ? <Check className="size-4 text-commit" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
            Copy link
          </button>
          <button type="button" onClick={() => copy("text")} className={btn}>
            {copied === "text" ? <Check className="size-4 text-commit" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            <span className="sm:hidden">Copy text</span>
            <span className="hidden sm:inline">Copy roast text</span>
          </button>
          <a href={xShareUrl(text, shareUrl)} target="_blank" rel="noopener noreferrer" className={btn}>
            Post on X
          </a>
          <a href={linkedInShareUrl(shareUrl)} target="_blank" rel="noopener noreferrer" className={btn}>
            <span className="sm:hidden">LinkedIn</span>
            <span className="hidden sm:inline">Share on LinkedIn</span>
          </a>
        </div>
        <p className="mt-3 min-h-6 text-[14px] text-muted" role="status" aria-live="polite">
          {status}
        </p>
        <Link href="/#roast" className="mt-2 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium text-commit hover:text-commit-hover">
          <RotateCcw className="size-4" aria-hidden /> Roast another profile
        </Link>
      </div>

      <div className={`order-1 lg:order-2 ${format === "portrait" ? "mx-auto w-full max-w-[300px] sm:max-w-[360px]" : "w-full"}`}>
        <div className="overflow-hidden rounded-lg border border-line shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]">
          <ScaledCard width={width} height={height} label="Preview of the share image">
            <ShareCard record={record} format={format} host={host} />
          </ScaledCard>
        </div>
      </div>

      {/* Unscaled off-screen copy: export source (scaled DOM can lay out differently). */}
      <div aria-hidden style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }}>
        <div ref={exportRef}>
          <ShareCard record={record} format={format} host={host} />
        </div>
      </div>
    </div>
  );
}
