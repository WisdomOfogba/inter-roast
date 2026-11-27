import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ReviewView } from "@/components/review/ReviewView";
import { SharePanel } from "@/components/share/SharePanel";
import { RoastForm } from "@/components/landing/RoastForm";
import { ScrollToTop } from "@/components/site/ScrollToTop";
import { resolveRecord } from "@/lib/share/resolve";
import { siteHost } from "@/lib/social-sharing/links";

export async function generateMetadata({ params }: PageProps<"/r/[token]">): Promise<Metadata> {
  const { token } = await params;
  const record = await resolveRecord(token);
  if (!record) return { title: "Roast not found", robots: { index: false } };
  const title = `@${record.profile.login}: ${record.result.archetype}`;
  return {
    title,
    description: record.result.headline,
    robots: { index: false, follow: false },
    openGraph: { title, description: record.result.headline },
    twitter: { card: "summary_large_image", title, description: record.result.headline },
  };
}

async function Result({ params }: { params: PageProps<"/r/[token]">["params"] }) {
  const { token } = await params;
  const record = await resolveRecord(token);
  if (!record) notFound();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${proto}://${host}/r/${token}`;
  const displayHost = process.env.NEXT_PUBLIC_SITE_URL ? siteHost(process.env.NEXT_PUBLIC_SITE_URL) : host;
  return (
    <div className="flex flex-col">
      <ScrollToTop />
      {/* Mobile: the share card comes first so it's the first thing people find. Desktop: after the roast. */}
      <div className="order-2 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:order-1">
        <ReviewView record={record} />
      </div>
      <section aria-labelledby="share" className="order-1 border-b border-line bg-panel/30 lg:order-2 lg:border-b-0 lg:border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14 lg:py-20">
          <SharePanel record={record} shareUrl={shareUrl} host={displayHost} />
        </div>
      </section>
      <section aria-labelledby="refresh-title" className="order-3 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h2 id="refresh-title" className="text-2xl font-semibold tracking-[-0.02em]">Changed your GitHub since?</h2>
            <p className="mt-3 max-w-md text-[17px] leading-relaxed text-muted">
              This link is a snapshot and always shows this roast. Fixed that README or finally archived the graveyard? Fetch the latest public data and get a
              new roast with a new link.
            </p>
          </div>
          <RoastForm variant="refresh" profile={record.profile.login} />
        </div>
      </section>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-busy="true" aria-label="Loading roast">
      <div className="flex items-center gap-5">
        <div className="size-[72px] animate-pulse rounded-full bg-panel-2" />
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-panel-2" />
          <div className="h-4 w-32 animate-pulse rounded bg-panel" />
        </div>
      </div>
      <div className="mt-12 h-16 max-w-2xl animate-pulse rounded bg-panel-2" />
    </div>
  );
}

export default function ResultPage({ params }: PageProps<"/r/[token]">) {
  return (
    <>
      <SiteNav ctaHref="/#roast" />
      <main id="main" className="flex-1">
        <Suspense fallback={<Skeleton />}>
          <Result params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
