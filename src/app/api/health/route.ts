import { connection } from "next/server";
import { checkStore, getStore, storeEnvPresence } from "@/lib/share/store";
import { getSigningSecret } from "@/lib/share/token";

/**
 * Deployment self-check: which features are configured. Reports only yes/no
 * and variable NAMES, never values. Add ?check=1 to test the share-link store live.
 */
export async function GET(request: Request) {
  await connection();
  const store = getStore();
  const live = new URL(request.url).searchParams.get("check") === "1";
  const storeCheck = live ? await checkStore(store) : null;

  const shareLinks = !store
    ? "long: no store configured (add Upstash for Redis and redeploy)"
    : store.kind === "memory"
      ? "short, but in-memory only (development)"
      : storeCheck && !storeCheck.ok
        ? `long: store configured (${store.kind}) but not working: ${storeCheck.error}`
        : `short (${store.kind})${storeCheck ? ", live check passed" : "; add ?check=1 to test it live"}`;

  return Response.json(
    {
      shareLinks,
      storeEnvPresent: storeEnvPresence(),
      githubToken: !!process.env.GITHUB_TOKEN?.trim(),
      gemini: !!process.env.GEMINI_API_KEY?.trim(),
      signingSecret: !!getSigningSecret(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
