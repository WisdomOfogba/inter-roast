import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { RotateCcw, Users } from "lucide-react";
import { Masthead } from "@/components/ui/Masthead";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Reveal } from "@/components/results/Reveal";
import { CardStudio } from "@/components/results/CardStudio";
import { decodeRecord, getSigningSecret } from "@/lib/share/token";
import { siteHost } from "@/lib/social-sharing/links";

export async function generateMetadata({ params }: PageProps<"/r/[token]">): Promise<Metadata> {
  const { token } = await params;
  const record = decodeRecord(token, getSigningSecret());
  if (!record) return { title: "Roast not found", robots: { index: false } };
  const who = record.handle ? `u/${record.handle}` : "Someone";
  const title = `${who} is ${record.result.personalityTitle}`;
  return {
    title,
    description: `${record.result.roastScore.toFixed(1)}/10 roast rating. ${record.result.closingStatement}`,
    robots: { index: false, follow: false },
    openGraph: { title, description: record.result.headline },
    twitter: { card: "summary_large_image", title, description: record.result.headline },
  };
}

async function Result({ params }: { params: PageProps<"/r/[token]">["params"] }) {
  const { token } = await params;
  const record = decodeRecord(token, getSigningSecret());
  if (!record) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${proto}://${host}/r/${token}`;
  const displayHost = process.env.NEXT_PUBLIC_SITE_URL ? siteHost(process.env.NEXT_PUBLIC_SITE_URL) : host;

  return (
    <>
      <section className="bg-ink text-paper">
        <Reveal record={record} />
      </section>

      <section aria-labelledby="studio" className="grain border-t-2 border-ink">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
            <h2 id="studio" className="font-display text-5xl uppercase leading-none sm:text-7xl">
              Make it <span className="hl">public</span>
            </h2>
            <p className="max-w-sm font-mono text-[11px] uppercase tracking-[0.14em] text-stone">Three card styles · post & story sizes · PNG export</p>
          </div>
          <CardStudio record={record} shareUrl={shareUrl} host={displayHost} />
        </div>
      </section>

      <section className="border-t-2 border-ink bg-acid">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center">
          <p className="max-w-2xl font-display text-[clamp(2.4rem,7vw,4.5rem)] uppercase leading-[0.9]">Now do your friends.</p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link href="/roast" className="inline-flex min-h-14 items-center justify-center gap-2 bg-ink px-6 font-display text-2xl tracking-wide text-acid hover:bg-heat hover:text-ink">
              <Users className="size-5" aria-hidden /> ROAST A FRIEND
            </Link>
            <Link href="/roast" className="inline-flex min-h-14 items-center justify-center gap-2 border-2 border-ink px-6 font-display text-2xl tracking-wide hover:bg-ink hover:text-acid">
              <RotateCcw className="size-5" aria-hidden /> ROAST ME AGAIN
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function ResultSkeleton() {
  return (
    <section className="bg-ink text-paper" aria-busy="true" aria-label="Loading roast">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="h-4 w-48 animate-pulse bg-ink-3" />
        <div className="mt-10 h-24 w-full max-w-2xl animate-pulse bg-ink-3" />
        <div className="mt-6 h-10 w-3/4 animate-pulse bg-ink-2" />
      </div>
    </section>
  );
}

export default function ResultPage({ params }: PageProps<"/r/[token]">) {
  return (
    <>
      <Masthead tone="dark" />
      <main id="main" className="flex-1">
        <Suspense fallback={<ResultSkeleton />}>
          <Result params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
