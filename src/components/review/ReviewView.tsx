import type { RoastRecord } from "@/types/roast";
import { CATEGORY_LABEL } from "@/types/roast";
import { LogoMark } from "@/components/brand/Logo";
import { ProfileHeader } from "./ProfileHeader";
import { Evidence } from "./Evidence";
import { LanguageBar } from "./LanguageBar";

const SOURCE_NOTE: Record<string, string> = {
  unconfigured: "Written by RepoRiot's rules engine from the facts below (AI writing isn't enabled on this deployment).",
  quota: "Gemini hit its free-tier limit, so RepoRiot's rules engine wrote this from the same facts. Try again later for the AI version.",
  unavailable: "Gemini was unavailable, so RepoRiot's rules engine wrote this from the same facts.",
  invalid_output: "Gemini's answer failed our checks, so RepoRiot's rules engine wrote this from the same facts.",
  blocked: "Gemini's safety filter stopped its answer, so RepoRiot's rules engine wrote this from the same facts.",
};

export function sourceNote(r: Pick<RoastRecord, "source" | "model" | "fallbackReason">): string {
  return r.source === "gemini"
    ? `Written by Google Gemini (${r.model}) from the public data below. Every cited repo, commit and number was checked against what GitHub returned.`
    : SOURCE_NOTE[r.fallbackReason ?? "unconfigured"];
}

function FactList({ facts }: { facts: RoastRecord["facts"] }) {
  return (
    <dl className="mt-3 divide-y divide-line">
      {facts.map((f) => (
        <div key={f.id} className="py-2.5">
          <dt className="text-[14px] text-muted">{f.label}</dt>
          <dd className="mt-0.5 break-words font-mono text-[15px] font-semibold">{f.value}</dd>
          <p className="mt-0.5 text-[12.5px] leading-snug text-faint">{f.definition}</p>
        </div>
      ))}
    </dl>
  );
}

interface Props {
  record: RoastRecord;
  /** Landing-page preview: fewer comments, no receipts column. */
  compact?: boolean;
  avatarSrc?: string | null;
  now?: number;
  /** False for the fictional example: no links to github.com. */
  linkable?: boolean;
}

export function ReviewView({ record, compact = false, avatarSrc, now, linkable = true }: Props) {
  const r = record.result;
  const comments = compact ? r.comments.slice(0, 2) : r.comments;
  const verdict = record.intensity === "mild" ? "Approved with comments" : "Changes requested";

  return (
    <div className={compact ? "" : "grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14"}>
      <article aria-labelledby={`headline-${record.caseId}`} className="min-w-0">
        <ProfileHeader profile={record.profile} avatarSrc={avatarSrc} linkable={linkable} />

        <div className="mt-10">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px]">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${record.intensity === "mild" ? "bg-commit/15 text-commit" : "bg-ember/15 text-ember"}`}>
              <span aria-hidden className={`size-2 rounded-full ${record.intensity === "mild" ? "bg-commit" : "bg-ember"}`} />
              {verdict}
            </span>
            <span className="text-muted">
              Diagnosis: <span className="font-semibold text-fg">{r.archetype}</span>
            </span>
          </p>
          <h1 id={`headline-${record.caseId}`} className="display mt-5 text-[clamp(2.1rem,6vw,3.75rem)] [text-wrap:balance]">
            {r.headline}
          </h1>
          <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-muted">{r.summary}</p>
        </div>

        {!compact && (
          <section aria-label="The roast" className="mt-10 border-l-2 border-ember pl-5 sm:pl-7">
            <p className="max-w-[66ch] text-[19px] leading-[1.65] text-fg sm:text-[21px]">{r.mainRoast}</p>
          </section>
        )}

        <section aria-label="Review comments" className={compact ? "mt-8 space-y-5" : "mt-12 space-y-6"}>
          {!compact && <h2 className="text-xl font-semibold tracking-[-0.02em]">{comments.length} review comments</h2>}
          {comments.map((c, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-panel px-4 py-2.5 text-[14px]">
                <span className="flex items-center gap-2">
                  <LogoMark size={16} />
                  <span className="font-semibold">RepoRiot</span>
                  <span className="text-muted">left a comment</span>
                </span>
                <span className="text-muted">{CATEGORY_LABEL[c.category]}</span>
              </div>
              <div className="bg-canvas px-4 py-4 sm:px-5">
                <h3 className="text-lg font-semibold leading-snug tracking-[-0.015em]">{c.title}</h3>
                <p className="mt-2 max-w-[66ch] text-[17px] leading-relaxed text-fg/90">{c.roast}</p>
              </div>
              <div className="border-t border-line bg-panel/60 px-4 sm:px-5">
                <h4 className="pt-3 text-[13px] font-medium text-faint">Receipts</h4>
                <ul className="divide-y divide-line">
                  {c.evidence.map((e, k) => (
                    <Evidence key={k} e={e} record={record} now={now} linkable={linkable} />
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </section>

        {!compact && (
          <section aria-label="Closing statement" className="mt-14">
            <p className="display max-w-[24ch] text-[clamp(1.75rem,4.6vw,2.75rem)] text-ember [text-wrap:balance]">{r.closingLine}</p>
          </section>
        )}
      </article>

      {!compact && (
        <aside aria-label="What we looked at" className="space-y-6">
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="font-semibold">Languages</h2>
            <div className="mt-4">
              <LanguageBar languages={record.languages} />
            </div>
          </div>
          <div className="rounded-lg border border-line bg-panel p-5">
            <h2 className="font-semibold">The numbers</h2>
            <p className="mt-1 text-[13px] text-faint">Counted from public data. Not a score, and not a measure of skill.</p>
            <FactList facts={record.facts.slice(0, 8)} />
            {record.facts.length > 8 && (
              <details className="group mt-1">
                <summary className="flex min-h-10 cursor-pointer list-none items-center text-[14px] font-medium text-commit hover:text-commit-hover">
                  <span className="group-open:hidden">Show all {record.facts.length} numbers</span>
                  <span className="hidden group-open:inline">Show fewer</span>
                </summary>
                <FactList facts={record.facts.slice(8)} />
              </details>
            )}
          </div>
          <div className="rounded-lg border border-line p-5 text-[14px] leading-relaxed text-muted">
            <h2 className="font-semibold text-fg">About this roast</h2>
            <p className="mt-2">{sourceNote(record)}</p>
            <p className="mt-2">
              Only public data is visible to us: private repositories and private contributions aren&apos;t included.
              {record.pinned === null && " Pinned repositories weren't checked (that needs a GitHub token on the server)."}
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
