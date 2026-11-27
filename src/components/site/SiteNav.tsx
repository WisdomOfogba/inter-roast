import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";

export function SiteNav({ ctaHref = "/#roast" }: { ctaHref?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="RepoRiot home" className="inline-flex min-h-11 items-center rounded-md">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/#how" className="hidden min-h-10 items-center rounded-md px-3 text-[15px] text-muted transition-colors hover:text-fg sm:inline-flex">
            How it works
          </Link>
          <Link href="/#example" className="hidden min-h-10 items-center rounded-md px-3 text-[15px] text-muted transition-colors hover:text-fg sm:inline-flex">
            Example roast
          </Link>
          <Link
            href={ctaHref}
            className="inline-flex min-h-10 items-center rounded-md bg-commit px-3.5 text-[15px] font-semibold text-commit-ink transition-colors hover:bg-commit-hover"
          >
            Roast a profile
          </Link>
        </div>
      </nav>
    </header>
  );
}
