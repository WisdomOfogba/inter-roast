import Link from "next/link";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function RoastNotFound() {
  return (
    <>
      <SiteNav />
      <main id="main" className="flex flex-1 items-center">
        <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
          <p className="font-mono text-[14px] text-ember">404: roast not found</p>
          <h1 className="display mt-3 text-[clamp(2.2rem,6vw,3.5rem)]">This link doesn&apos;t check out.</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Roast links are signed, so an edited or incomplete link won&apos;t open. Ask for the original link, or roast the profile yourself.
          </p>
          <Link href="/#roast" className="mt-8 inline-flex min-h-12 items-center rounded-md bg-commit px-5 font-semibold text-commit-ink hover:bg-commit-hover">
            Roast a profile
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
