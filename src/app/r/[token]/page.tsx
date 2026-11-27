import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ReviewView } from "@/components/review/ReviewView";
import { SharePanel } from "@/components/share/SharePanel";
import { decodeRecord, getSigningSecret } from "@/lib/share/token";
import { siteHost } from "@/lib/social-sharing/links";

export async function generateMetadata({ params }: PageProps<"/r/[token]">): Promise<Metadata> {
  const { token } = await params;
  const record = decodeRecord(token, getSigningSecret());
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
  const record = decodeRecord(token, getSigningSecret());
  if (!record) notFound();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${proto}://${host}/r/${token}`;
  const displayHost = process.env.NEXT_PUBLIC_SITE_URL ? siteHost(process.env.NEXT_PUBLIC_SITE_URL) : host;
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <ReviewView record={record} />
      </div>
      <section aria-labelledby="share" className="border-t border-line bg-panel/30">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <SharePanel record={record} shareUrl={shareUrl} host={displayHost} />
        </div>
      </section>
    </>
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
