"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, Flame } from "lucide-react";
import { LIMITS } from "@/lib/validation/input";
import { parseRedditHandle } from "@/lib/validation/reddit-handle";
import { SAMPLES } from "@/lib/samples";
import { INTENSITIES, type Intensity } from "@/types/roast";
import { LoadingScreen } from "./LoadingScreen";

const INTENSITY_INFO: Record<Intensity, { label: string; blurb: string; flames: number }> = {
  playful: { label: "Playful", blurb: "Light teasing. Brunch-friendly.", flames: 1 },
  brutal: { label: "Brutal", blurb: "Sharper. Says the quiet part.", flames: 2 },
  savage: { label: "Savage", blurb: "Maximum heat. Still no low blows.", flames: 3 },
};

const SAMPLE_LABELS: { key: keyof typeof SAMPLES; label: string }[] = [
  { key: "tech", label: "Tech arguer" },
  { key: "relationships", label: "Advice giver" },
  { key: "finance", label: "Money talker" },
  { key: "entertainment", label: "TV critic" },
];

type FieldErrors = Partial<Record<"handle" | "bio" | "content" | "context" | "consent" | "form", string>>;

function Counter({ value, max }: { value: string; max: number }) {
  const n = value.length;
  const near = n > max * 0.9;
  return (
    <span className={`font-mono text-[11px] tabular-nums ${n > max ? "text-heat-deep font-semibold" : near ? "text-ink" : "text-stone"}`} aria-live={near ? "polite" : "off"}>
      {n.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
    </span>
  );
}

export function RoastForm() {
  const router = useRouter();
  const params = useSearchParams();
  const uid = useId();
  const [handle, setHandle] = useState(() => params.get("u")?.slice(0, 40) ?? "");
  const [bio, setBio] = useState("");
  const [content, setContent] = useState("");
  const [context, setContext] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("brutal");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (params.get("u")) contentRef.current?.focus();
  }, [params]);

  // With Cache Components this route stays mounted (hidden) after navigating
  // to the result; clear the overlay so "back" shows the form, not a spinner.
  useEffect(() => () => setLoading(false), []);

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (handle.trim()) {
      const p = parseRedditHandle(handle);
      if (!p.ok) e.handle = p.error;
    }
    if (bio.length > LIMITS.bio) e.bio = `Bio is capped at ${LIMITS.bio} characters.`;
    if (content.length > LIMITS.content) e.content = `Receipts are capped at ${LIMITS.content.toLocaleString("en-US")} characters.`;
    else if ((bio + content).replace(/\s+/g, " ").trim().length < LIMITS.minTotal)
      e.content = `Paste at least ${LIMITS.minTotal} characters of posts, comments or bio. We need something to work with.`;
    if (context.length > LIMITS.context) e.context = `Extra context is capped at ${LIMITS.context} characters.`;
    if (!consent) e.consent = "Tick the box: this is your content, or your friend is in on it.";
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, bio, content, context, intensity, consent }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string; fieldErrors?: FieldErrors };
      if (!res.ok || !data.token) {
        setErrors({ ...(data.fieldErrors ?? {}), form: data.error ?? "Something went wrong. Try again in a moment." });
        setLoading(false);
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      router.push(`/r/${data.token}`);
    } catch {
      setErrors({ form: "Couldn't reach the roasting room. Check your connection and try again." });
      setLoading(false);
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  };

  const errorList = Object.entries(errors).filter(([, v]) => v);
  const fieldClass = (bad?: string) =>
    `w-full border-2 bg-paper px-4 py-3 text-base leading-relaxed placeholder:text-stone-light focus:outline-none focus-visible:outline-3 focus-visible:outline-heat focus-visible:outline-offset-2 ${bad ? "border-heat" : "border-ink"}`;
  const labelClass = "font-display text-2xl uppercase leading-none tracking-wide";

  return (
    <>
      {loading && <LoadingScreen intensity={intensity} />}
      <form onSubmit={submit} noValidate className="grid gap-10" aria-busy={loading}>
        {errorList.length > 0 && (
          <div ref={errorRef} tabIndex={-1} role="alert" className="flex gap-3 border-2 border-heat bg-heat/10 p-4 focus:outline-none">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-heat-deep" aria-hidden />
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-heat-deep">Hold up</p>
              <ul className="mt-1 space-y-1 text-[15px]">
                {errorList.map(([k, v]) => (
                  <li key={k}>{v}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 01 handle */}
        <div className="grid gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={`${uid}-handle`} className={labelClass}>
              <span className="mr-3 text-heat">01</span>Your Reddit username
            </label>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-stone">Optional</span>
          </div>
          <div className={`flex items-center border-2 bg-paper ${errors.handle ? "border-heat" : "border-ink"}`}>
            <span aria-hidden className="pl-4 font-mono text-lg text-stone">u/</span>
            <input
              id={`${uid}-handle`}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              maxLength={200}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="username or reddit.com/user/… link"
              aria-invalid={!!errors.handle}
              aria-describedby={`${uid}-handle-hint`}
              className="h-13 w-full min-w-0 bg-transparent px-2 py-3 font-mono text-lg placeholder:text-stone-light focus:outline-none"
            />
          </div>
          <p id={`${uid}-handle-hint`} className="text-sm text-stone">
            Printed on your card. We don&apos;t look it up: Reddit&apos;s Data API now needs approval we don&apos;t have, and we won&apos;t scrape.
          </p>
        </div>

        {/* 02 receipts */}
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor={`${uid}-content`} className={labelClass}>
              <span className="mr-3 text-heat">02</span>The receipts
            </label>
            <Counter value={content} max={LIMITS.content} />
          </div>
          <p id={`${uid}-content-hint`} className="text-[15px] leading-relaxed text-ink/80">
            Open your Reddit profile, copy 5–10 posts or comments, and paste them here. Separate each one with a blank line. Include subreddit names like{" "}
            <code className="bg-paper-2 px-1 font-mono text-[13px]">r/whatever</code> if you want them roasted too.
          </p>
          <textarea
            ref={contentRef}
            id={`${uid}-content`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={11}
            placeholder={"Honestly, if you're not using a mechanical keyboard in 2026, I don't know what to tell you.\n\nActually, that's not what the study said. Source?\n\n…"}
            aria-invalid={!!errors.content}
            aria-describedby={`${uid}-content-hint`}
            className={`${fieldClass(errors.content)} min-h-64 resize-y font-sans`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-stone">No receipts handy? Try a sample:</span>
            {SAMPLE_LABELS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setContent(SAMPLES[s.key]);
                  setErrors((e) => ({ ...e, content: undefined }));
                }}
                className="min-h-10 border-2 border-ink px-3 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors hover:bg-ink hover:text-paper"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 03 bio + context */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid content-start gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`${uid}-bio`} className={labelClass}>
                <span className="mr-3 text-heat">03</span>Bio
              </label>
              <Counter value={bio} max={LIMITS.bio} />
            </div>
            <textarea
              id={`${uid}-bio`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Your public Reddit bio, if you have one."
              aria-invalid={!!errors.bio}
              className={`${fieldClass(errors.bio)} resize-y`}
            />
          </div>
          <div className="grid content-start gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`${uid}-context`} className={labelClass}>
                <span className="mr-3 text-heat">04</span>Extra context
              </label>
              <Counter value={context} max={LIMITS.context} />
            </div>
            <textarea
              id={`${uid}-context`}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder="Optional. e.g. 'I mostly post in r/espresso and argue about grinders.'"
              aria-invalid={!!errors.context}
              className={`${fieldClass(errors.context)} resize-y`}
            />
          </div>
        </div>

        {/* 05 intensity */}
        <fieldset className="grid gap-3">
          <legend className={labelClass}>
            <span className="mr-3 text-heat">05</span>Heat level
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {INTENSITIES.map((level) => {
              const info = INTENSITY_INFO[level];
              const active = intensity === level;
              return (
                <label
                  key={level}
                  className={`relative flex min-h-20 cursor-pointer flex-col justify-between border-2 border-ink p-4 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-heat ${
                    active ? (level === "savage" ? "bg-heat text-ink" : "bg-ink text-paper") : "bg-paper hover:bg-paper-2"
                  }`}
                >
                  <input type="radio" name="intensity" value={level} checked={active} onChange={() => setIntensity(level)} className="sr-only" />
                  <span className="flex items-center justify-between">
                    <span className="font-display text-2xl uppercase leading-none tracking-wide">{info.label}</span>
                    <span className="flex gap-0.5" aria-hidden>
                      {Array.from({ length: 3 }, (_, i) => (
                        <Flame key={i} className={`size-4 ${i < info.flames ? "" : "opacity-25"}`} />
                      ))}
                    </span>
                  </span>
                  <span className={`mt-2 font-mono text-[11px] uppercase tracking-[0.08em] ${active ? "" : "text-stone"}`}>{info.blurb}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* consent + submit */}
        <div className="grid gap-5 border-t-2 border-ink pt-6">
          <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              aria-invalid={!!errors.consent}
              className="mt-1 size-5 shrink-0 cursor-pointer accent-ink"
            />
            <span>
              This is <strong>my own content</strong>, or my friend knows they&apos;re being roasted. I won&apos;t paste anything private, and I get that this is
              comedy, not an assessment.
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="group flex min-h-16 w-full items-center justify-center gap-3 bg-heat px-6 font-display text-3xl tracking-wide text-ink transition-colors hover:bg-ink hover:text-acid disabled:opacity-60 sm:w-auto sm:justify-self-start sm:px-10"
          >
            ROAST ME
            <ArrowRight className="size-6 transition-transform group-hover:translate-x-1" aria-hidden />
          </button>
          <p className="text-sm text-stone">Takes a few seconds. Your text is used once and never stored.</p>
        </div>
      </form>
    </>
  );
}
