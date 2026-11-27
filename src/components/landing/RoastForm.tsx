"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Check, CircleAlert, LoaderCircle, Minus, RotateCcw } from "lucide-react";
import { GitHubIcon } from "@/components/brand/GitHubIcon";
import { parseGitHubProfile } from "@/lib/github/url";
import { INTENSITIES, type Intensity } from "@/types/roast";
import type { CollectStage } from "@/types/github";

const STAGE_LABEL: Record<CollectStage, string> = {
  profile: "Finding the GitHub profile",
  repos: "Listing public repositories",
  readmes: "Reading README files",
  activity: "Checking public activity and commits",
  roast: "Writing the roast",
};

const HEAT: Record<Intensity, { label: string; hint: string }> = {
  mild: { label: "Mild", hint: "Friendly teasing" },
  spicy: { label: "Spicy", hint: "Honest code review" },
  scorched: { label: "Scorched", hint: "No mercy (still no low blows)" },
};

type StageState = { stage: CollectStage; status: "start" | "done" | "skipped"; detail?: string };
type Failure = { code: string; message: string; resetAt?: number };
type Phase = "idle" | "running" | "error" | "done";

function failureText(f: Failure): string {
  if (f.code === "rate_limited" && f.resetAt) {
    const t = new Date(f.resetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `GitHub's API limit for RepoRiot is used up. It resets at ${t}.`;
  }
  return f.message;
}

interface RoastFormProps {
  autoFocus?: boolean;
  /** "refresh": fixed profile, bypasses cached GitHub data and cached roasts. */
  variant?: "hero" | "refresh";
  profile?: string;
}

export function RoastForm({ autoFocus = false, variant = "hero", profile: fixedProfile }: RoastFormProps) {
  const isRefresh = variant === "refresh";
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(fixedProfile ?? "");
  const [notes, setNotes] = useState<string[]>([]);
  const [heat, setHeat] = useState<Intensity>("spicy");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stages, setStages] = useState<StageState[]>([]);
  const [failure, setFailure] = useState<Failure | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Cache Components keeps this route mounted (hidden) after navigation;
  // reset so "back" shows the form, and cancel any in-flight request.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      setPhase("idle");
      setStages([]);
    },
    [],
  );

  const run = async (profile: string) => {
    setPhase("running");
    setStages([]);
    setNotes([]);
    setFailure(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, intensity: heat, refresh: isRefresh }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as Failure | null;
        setFailure(data?.message ? data : { code: "http", message: `Something went wrong (${res.status}). Try again.` });
        setPhase("error");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(chunk, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg.type === "stage") {
            setStages((prev) => {
              const next = prev.filter((s) => s.stage !== msg.stage);
              return [...next, { stage: msg.stage, status: msg.status, detail: msg.detail }];
            });
          } else if (msg.type === "note") {
            setNotes((n) => [...n, msg.message]);
          } else if (msg.type === "result") {
            setPhase("done");
            router.push(`/r/${msg.token}`);
            return;
          } else if (msg.type === "error") {
            setFailure(msg);
            setPhase("error");
            return;
          }
        }
      }
      setFailure({ code: "stream", message: "The connection closed before the roast finished. Try again." });
      setPhase("error");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setFailure({ code: "network", message: "Couldn't reach RepoRiot. Check your connection and try again." });
      setPhase("error");
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (phase === "running" || phase === "done") return;
    const parsed = parseGitHubProfile(value);
    if (!parsed.ok) {
      setFieldError(parsed.error);
      inputRef.current?.focus();
      return;
    }
    setFieldError(null);
    run(parsed.username);
  };

  const busy = phase === "running" || phase === "done";

  return (
    <div className="w-full">
      <form onSubmit={submit} noValidate aria-busy={busy}>
        {!isRefresh && (
        <>
        <label htmlFor={`${id}-url`} className="mb-2 block text-[15px] font-medium text-fg">
          GitHub profile
        </label>
        <div
          className={`flex flex-col gap-2 rounded-lg border bg-panel p-2 transition-colors focus-within:border-line-strong sm:flex-row sm:items-center ${
            fieldError ? "border-ember" : "border-line"
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-2.5">
            <GitHubIcon className="size-5 shrink-0 text-muted" />
            <input
              ref={inputRef}
              id={`${id}-url`}
              name="profile"
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={value}
              disabled={busy}
              onChange={(e) => {
                setValue(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              placeholder="https://github.com/username"
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `${id}-err` : `${id}-hint`}
              className="h-12 w-full min-w-0 bg-transparent font-mono text-[15px] text-fg placeholder:text-faint focus:outline-none disabled:opacity-60 sm:text-base"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-commit px-5 text-base font-semibold text-commit-ink transition-colors hover:bg-commit-hover disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {busy ? "Roasting…" : "Roast this profile"}
          </button>
        </div>
        {fieldError ? (
          <p id={`${id}-err`} role="alert" className="mt-2 flex items-start gap-1.5 text-[15px] text-ember">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {fieldError}
          </p>
        ) : (
          <p id={`${id}-hint`} className="mt-2 text-sm text-muted">
            Public data only. No GitHub login, nothing stored.
          </p>
        )}
        </>
        )}

        <fieldset className={isRefresh ? "" : "mt-5"} disabled={busy}>
          <legend className="mb-2 text-[15px] font-medium text-fg">Heat</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-panel p-1" role="radiogroup">
            {INTENSITIES.map((h) => (
              <label
                key={h}
                className={`relative flex min-h-12 cursor-pointer flex-col justify-center rounded-md px-2.5 py-1.5 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-commit sm:px-3 sm:text-left ${
                  heat === h ? (h === "scorched" ? "bg-ember text-[#1a0a04]" : "bg-panel-2 text-fg ring-1 ring-line-strong") : "text-muted hover:text-fg"
                }`}
              >
                <input type="radio" name="heat" value={h} checked={heat === h} onChange={() => setHeat(h)} className="sr-only" />
                <span className="text-[15px] font-semibold">{HEAT[h].label}</span>
                <span className={`hidden text-[13px] sm:block ${heat === h && h === "scorched" ? "text-[#3a1206]" : "text-faint"}`}>{HEAT[h].hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {isRefresh && (
          <button
            type="submit"
            disabled={busy}
            className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-commit px-5 text-base font-semibold text-commit-ink transition-colors hover:bg-commit-hover disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
            {busy ? "Fetching latest data…" : "Fetch latest data and re-roast"}
          </button>
        )}
      </form>

      {phase !== "idle" && (
        <div className="mt-5 overflow-hidden rounded-lg border border-line bg-[#0b0d0c]" role="status" aria-live="polite">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="font-mono text-[13px] text-muted">reporiot roast</span>
            {phase === "running" && <LoaderCircle className="size-4 animate-spin text-commit" aria-label="Working" />}
          </div>
          <ol className="space-y-2 px-4 py-3.5 font-mono text-[13px] sm:text-sm">
            {stages.map((s) => (
              <li key={s.stage} className="flex animate-line-in gap-2.5">
                <span className="mt-[3px] shrink-0" aria-hidden>
                  {s.status === "start" ? (
                    <LoaderCircle className="size-3.5 animate-spin text-amber" />
                  ) : s.status === "done" ? (
                    <Check className="size-3.5 text-commit" />
                  ) : (
                    <Minus className="size-3.5 text-faint" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className={s.status === "start" ? "text-fg" : "text-muted"}>{STAGE_LABEL[s.stage]}</span>
                  {s.detail && <span className="block break-words text-faint">{s.detail}</span>}
                </span>
              </li>
            ))}
            {notes.map((n) => (
              <li key={n} className="text-amber">{n}</li>
            ))}
            {phase === "running" && stages.length === 0 && (
              <li className="text-muted">
                Connecting<span className="animate-caret">_</span>
              </li>
            )}
            {phase === "done" && <li className="text-commit">Roast ready. Opening it now.</li>}
          </ol>
          {phase === "error" && failure && (
            <div className="border-t border-line px-4 py-3.5">
              <p role="alert" className="flex items-start gap-2 text-[15px] text-fg">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden />
                {failureText(failure)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!["not_found", "organization", "invalid_url"].includes(failure.code) && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = parseGitHubProfile(value);
                      if (p.ok) run(p.username);
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line-strong px-3 text-[15px] font-medium hover:bg-panel-2"
                  >
                    <RotateCcw className="size-4" aria-hidden /> Try again
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    setStages([]);
                    inputRef.current?.select();
                  }}
                  className="inline-flex min-h-10 items-center rounded-md px-3 text-[15px] text-muted hover:text-fg"
                >
                  Use a different profile
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
