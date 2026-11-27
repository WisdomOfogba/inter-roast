import Link from "next/link";
import { Masthead } from "@/components/ui/Masthead";
import { SiteFooter } from "@/components/ui/SiteFooter";

export default function RoastNotFound() {
  return (
    <>
      <Masthead />
      <main id="main" className="grain flex flex-1 items-center">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone">Error 404 · Evidence missing</p>
          <h1 className="mt-4 font-display text-[clamp(3rem,12vw,7rem)] uppercase leading-[0.86]">
            This roast <span className="hl">doesn&apos;t check out.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/80">
            The link is broken, edited or forged. Roast links are signed, so we can&apos;t show a roast we didn&apos;t write.
          </p>
          <Link href="/roast" className="mt-8 inline-flex min-h-14 items-center bg-heat px-6 font-display text-2xl tracking-wide hover:bg-ink hover:text-acid">
            GET A REAL ONE
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
