import { connection } from "next/server";
import { readStats, statsKeyOk } from "@/lib/stats";

/** Private usage stats: GET /api/stats?key=<STATS_KEY>. 404 without the key, so it isn't discoverable. */
export async function GET(request: Request) {
  await connection();
  const key = new URL(request.url).searchParams.get("key") ?? request.headers.get("x-stats-key");
  if (!statsKeyOk(key)) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const stats = await readStats();
    if (!stats) return Response.json({ error: "No store configured (connect Upstash for Redis)." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return Response.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Couldn't read stats from the store." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
