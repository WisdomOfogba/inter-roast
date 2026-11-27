"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { parseRedditHandle } from "@/lib/validation/reddit-handle";

export function HandleForm() {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseRedditHandle(value);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    router.push(`/roast?u=${encodeURIComponent(parsed.handle)}`);
  };

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-xl">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone">
        Reddit username or profile URL
      </label>
      <div className={`mt-2 flex flex-col border-2 bg-paper sm:flex-row ${error ? "border-heat" : "border-ink"}`}>
        <div className="flex flex-1 items-center">
          <span aria-hidden className="pl-4 font-mono text-lg text-stone">u/</span>
          <input
            id={id}
            name="handle"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="text"
            placeholder="your_username"
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : `${id}-hint`}
            className="h-14 w-full min-w-0 bg-transparent px-2 font-mono text-lg placeholder:text-stone-light focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="group flex h-14 items-center justify-center gap-2 border-t-2 border-ink bg-heat px-6 font-display text-2xl tracking-wide text-ink transition-colors hover:bg-ink hover:text-acid sm:border-l-2 sm:border-t-0"
        >
          ROAST ME
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-2 font-mono text-[13px] text-heat-deep">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-2 text-sm text-stone">
          Next you&apos;ll paste a few posts or comments: that&apos;s the evidence. No Reddit login, nothing fetched behind your back.
        </p>
      )}
    </form>
  );
}
