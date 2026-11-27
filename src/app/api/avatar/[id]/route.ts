/**
 * Same-origin proxy for GitHub avatars, so share-card PNG export (which
 * inlines images) never trips over cross-origin rules. Only numeric user ids.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/avatar/[id]">) {
  const { id } = await ctx.params;
  if (!/^\d{1,12}$/.test(id)) return new Response("Bad id", { status: 400 });
  try {
    const res = await fetch(`https://avatars.githubusercontent.com/u/${id}?s=256&v=4`, { signal: AbortSignal.timeout(8000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return new Response("Not found", { status: 404 });
    return new Response(res.body, {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return new Response("Upstream error", { status: 502 });
  }
}
