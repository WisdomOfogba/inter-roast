import { FileText, GitCommitHorizontal, Hash, Star } from "lucide-react";
import type { RoastRecord, EvidenceRef } from "@/types/roast";
import { ago, ghRepoUrl } from "./format";

function Ref({ linkable, href, className, children }: { linkable: boolean; href: string; className: string; children: React.ReactNode }) {
  if (linkable) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return <span className={className.replace(/underline\S*|decoration-\S+|hover:\S+/g, "")}>{children}</span>;
}

/** Renders one piece of evidence from the record. Values always come from GitHub data, never from the model. */
export function Evidence({ e, record, now, linkable = true }: { e: EvidenceRef; record: Pick<RoastRecord, "profile" | "repos" | "readmes" | "facts" | "commits">; now?: number; linkable?: boolean }) {
  const login = record.profile.login;

  if (e.kind === "repo") {
    const r = record.repos.find((x) => x.name === e.ref);
    return (
      <li className="flex gap-3 py-3">
        <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 text-faint" fill="currentColor" aria-hidden>
          <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
        </svg>
        <div className="min-w-0">
          <Ref linkable={linkable} href={ghRepoUrl(login, e.ref)} className="break-all font-mono text-[15px] font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
            {e.ref}
          </Ref>
          {r && (
            <>
              <p className={`mt-0.5 text-[15px] ${r.description ? "text-muted" : "italic text-faint"}`}>{r.description ?? "No description"}</p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[13px] text-faint">
                {r.language && <span>{r.language}</span>}
                <span className="inline-flex items-center gap-1"><Star className="size-3.5" aria-hidden />{r.stars}<span className="sr-only"> stars</span></span>
                <span>pushed {ago(r.pushedAt, now)}</span>
                {r.isFork && <span>fork</span>}
              </p>
            </>
          )}
        </div>
      </li>
    );
  }

  if (e.kind === "readme") {
    const r = record.readmes.find((x) => x.repo === e.ref);
    const status = !r ? "README checked" : r.missing ? "No README" : r.template ? `Unedited ${r.template} starter README` : `${r.words} words, ${r.headings} headings, ${r.codeBlocks} code blocks`;
    return (
      <li className="flex gap-3 py-3">
        <FileText className="mt-1 size-4 shrink-0 text-faint" aria-hidden />
        <div className="min-w-0">
          <Ref linkable={linkable} href={`${ghRepoUrl(login, e.ref)}#readme`} className="break-all font-mono text-[15px] font-medium underline decoration-line-strong underline-offset-4 hover:decoration-fg">
            {e.ref}/README.md
          </Ref>
          <p className={`mt-0.5 text-[15px] ${r?.missing || r?.template ? "text-amber" : "text-muted"}`}>{status}</p>
          {r && !r.missing && r.excerpt && <p className="mt-1 line-clamp-2 text-[14px] italic text-faint">&ldquo;{r.excerpt}&rdquo;</p>}
        </div>
      </li>
    );
  }

  if (e.kind === "commit") {
    const c = record.commits.find((x) => x.id === e.ref);
    if (!c) return null;
    return (
      <li className="flex gap-3 py-3">
        <GitCommitHorizontal className="mt-1 size-4 shrink-0 text-faint" aria-hidden />
        <div className="min-w-0">
          <p className="break-words font-mono text-[15px] text-fg">&ldquo;{c.message}&rdquo;</p>
          <p className="mt-0.5 font-mono text-[13px] text-faint">
            <Ref linkable={linkable} href={`${ghRepoUrl(login, c.repo)}/commits`} className="underline decoration-line underline-offset-4 hover:text-muted">
              {c.repo}
            </Ref>
            {c.date && <span>, {ago(c.date, now)}</span>}
          </p>
        </div>
      </li>
    );
  }

  const f = record.facts.find((x) => x.id === e.ref);
  if (!f) return null;
  return (
    <li className="flex gap-3 py-3">
      <Hash className="mt-1 size-4 shrink-0 text-faint" aria-hidden />
      <div className="min-w-0">
        <p className="text-[15px]">
          <span className="text-muted">{f.label}: </span>
          <span className="font-mono font-semibold text-fg">{f.value}</span>
        </p>
        <p className="mt-0.5 text-[13px] text-faint">{f.definition}</p>
      </div>
    </li>
  );
}
