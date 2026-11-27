import Link from "next/link";
import { BookOpen, FileCode2 } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { GitHubIcon } from "@/components/brand/GitHubIcon";
import { SOURCE_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">Your code has receipts. We just read them out loud.</p>
        </div>
        <div id="privacy" className="text-[15px] leading-relaxed text-muted">
          <h2 className="font-semibold text-fg">Privacy</h2>
          <p className="mt-2">
            We only read public data from the GitHub REST API. Nothing is stored: no accounts, no database. A share link contains the roast and the public
            repo details it cites. When AI is enabled, that public data is sent to Google Gemini to write the roast.
          </p>
        </div>
        <div className="text-[15px] leading-relaxed text-muted">
          <h2 className="font-semibold text-fg">The fine print</h2>
          <p className="mt-2">Comedy about public repos, not a judgement of anyone&apos;s skill. Not affiliated with or endorsed by GitHub, Inc.</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <li><Link className="inline-flex min-h-8 items-center gap-1.5 hover:text-fg" href="/#how"><BookOpen className="size-4" aria-hidden />How it works</Link></li>
            <li><a className="inline-flex min-h-8 items-center gap-1.5 hover:text-fg" href="https://docs.github.com/en/rest" rel="noopener noreferrer" target="_blank"><FileCode2 className="size-4" aria-hidden />GitHub REST API</a></li>
            <li><a className="inline-flex min-h-8 items-center gap-1.5 hover:text-fg" href={SOURCE_URL} rel="noopener noreferrer" target="_blank"><GitHubIcon className="size-4" />Star on GitHub</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
