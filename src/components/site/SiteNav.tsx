import Link from "next/link";
import { BookOpen, Flame, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { StarButton } from "./StarButton";

export function SiteNav({ ctaHref = "/#roast" }: { ctaHref?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="RepoRiot home" className="inline-flex min-h-11 items-center rounded-md">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/#how" className="hidden min-h-10 items-center gap-1.5 rounded-md px-3 text-[15px] text-muted transition-colors hover:text-fg md:inline-flex">
            <BookOpen className="size-4" aria-hidden /> How it works
          </Link>
          <Link href="/#example" className="hidden min-h-10 items-center gap-1.5 rounded-md px-3 text-[15px] text-muted transition-colors hover:text-fg md:inline-flex">
            <Sparkles className="size-4" aria-hidden /> Example roast
          </Link>
          <StarButton />
          <Link
            href={ctaHref}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-commit px-3 text-[15px] font-semibold text-commit-ink transition-colors hover:bg-commit-hover sm:px-3.5"
          >
            <Flame className="size-4" aria-hidden />
            <span className="hidden min-[400px]:inline">Roast a profile</span>
            <span className="min-[400px]:hidden">Roast</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
