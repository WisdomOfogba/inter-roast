import type { FallbackReason, Intensity, PreparedSubmission, RoastResult, RoastSource } from "@/types/roast";
import {
  DEFAULT_QUOTA_FALLBACK_MODEL,
  generateWithGemini,
  GeminiFailure,
  readGeminiConfig,
  type GenerateClient,
} from "@/lib/gemini/client";
import { generateLocalRoast } from "./generate";

export { generateLocalRoast } from "./generate";
export { analyze } from "./analyze";

export interface RoastOutcome {
  result: RoastResult;
  source: RoastSource;
  model?: string;
  fallbackReason?: FallbackReason;
}

/**
 * Per-instance memory of models that recently returned 429, so we stop
 * calling them until the cooldown passes instead of hammering the quota.
 */
const cooldowns = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 60_000;

export function _resetCooldowns() {
  cooldowns.clear();
}

function coolingDown(model: string, now: number) {
  return (cooldowns.get(model) ?? 0) > now;
}

/**
 * Generate a roast: Gemini first (if configured), the local engine otherwise.
 * When Gemini fails we never pretend it succeeded: the outcome says
 * source="engine" with the reason, and the UI shows it.
 */
export async function createRoast(
  sub: PreparedSubmission,
  intensity: Intensity,
  opts: { env?: NodeJS.ProcessEnv; client?: GenerateClient; now?: () => number } = {},
): Promise<RoastOutcome> {
  const env = opts.env ?? process.env;
  const now = opts.now ?? Date.now;
  const config = readGeminiConfig(env);
  if (!config) {
    return { result: generateLocalRoast(sub, intensity), source: "engine", fallbackReason: "unconfigured" };
  }

  const quotaFallback = (env.GEMINI_QUOTA_FALLBACK_MODEL ?? DEFAULT_QUOTA_FALLBACK_MODEL).trim();
  const models = [config.model];
  if (quotaFallback && quotaFallback !== "none" && quotaFallback !== config.model) models.push(quotaFallback);

  let lastReason: FallbackReason = "unavailable";
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (coolingDown(model, now())) {
      lastReason = "quota";
      continue;
    }
    try {
      const result = await generateWithGemini(sub, intensity, { ...config, model }, opts.client);
      return { result, source: "gemini", model };
    } catch (err) {
      const failure = err instanceof GeminiFailure ? err : new GeminiFailure("unavailable", String(err));
      lastReason = failure.reason;
      // Only a 429 moves on to the next free model: a rejected request didn't
      // consume quota. Every other failure goes straight to the local engine.
      if (failure.reason === "quota") {
        cooldowns.set(model, now() + Math.min(failure.retryAfterMs ?? DEFAULT_COOLDOWN_MS, 10 * 60_000));
        continue;
      }
      console.warn(`[roast] Gemini ${model} failed: ${failure.reason}`);
      break;
    }
  }

  return { result: generateLocalRoast(sub, intensity), source: "engine", fallbackReason: lastReason };
}
