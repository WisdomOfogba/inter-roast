import type { Footprint } from "@/types/github";
import type { FallbackReason, Intensity, RoastResult, RoastSource } from "@/types/roast";
import { DEFAULT_QUOTA_FALLBACK_MODEL, generateWithGemini, GeminiFailure, readGeminiConfig, type GenerateClient } from "@/lib/gemini/client";
import { generateEngineRoast } from "./engine";

export interface RoastOutcome {
  result: RoastResult;
  source: RoastSource;
  model?: string;
  fallbackReason?: FallbackReason;
}

/** Models that recently returned 429, so we stop calling them until cooldown passes. */
const cooldowns = new Map<string, number>();
export function _resetCooldowns() {
  cooldowns.clear();
}

/**
 * Gemini first (if configured); the rules engine otherwise. A fallback is
 * never presented as an AI result: the outcome carries source + reason.
 */
export async function createRoast(
  fp: Footprint,
  intensity: Intensity,
  opts: { env?: NodeJS.ProcessEnv; client?: GenerateClient; now?: () => number } = {},
): Promise<RoastOutcome> {
  const env = opts.env ?? process.env;
  const now = opts.now ?? Date.now;
  const config = readGeminiConfig(env);
  if (!config) return { result: generateEngineRoast(fp, intensity, now()), source: "engine", fallbackReason: "unconfigured" };

  const fallbackModel = (env.GEMINI_QUOTA_FALLBACK_MODEL ?? DEFAULT_QUOTA_FALLBACK_MODEL).trim();
  const models = [config.model];
  if (fallbackModel && fallbackModel !== "none" && fallbackModel !== config.model) models.push(fallbackModel);

  let reason: FallbackReason = "unavailable";
  for (const model of models) {
    if ((cooldowns.get(model) ?? 0) > now()) {
      reason = "quota";
      continue;
    }
    try {
      return { result: await generateWithGemini(fp, intensity, { ...config, model }, opts.client), source: "gemini", model };
    } catch (err) {
      const f = err instanceof GeminiFailure ? err : new GeminiFailure("unavailable", String(err));
      reason = f.reason;
      // Only a 429 moves to the next free model (a rejected call used no quota).
      if (f.reason === "quota") {
        cooldowns.set(model, now() + Math.min(f.retryAfterMs ?? 60_000, 10 * 60_000));
        continue;
      }
      console.warn(`[roast] Gemini ${model} failed: ${f.reason}`);
      break;
    }
  }
  return { result: generateEngineRoast(fp, intensity, now()), source: "engine", fallbackReason: reason };
}
