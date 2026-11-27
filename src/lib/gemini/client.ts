import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from "@google/genai";
import type { Footprint } from "@/types/github";
import type { FallbackReason, Intensity, RoastResult } from "@/types/roast";
import { BlockedOutputError, InvalidOutputError, parseModelOutput, roastOutputJsonSchema } from "@/lib/validation/roast-output";
import { buildUserPrompt, SYSTEM_INSTRUCTION } from "./prompt";

/** Server-only. Reads GEMINI_API_KEY; never import from client components. */

/** Verified free-tier models (Gemini API pricing page, Nov 2026). */
export const DEFAULT_MODEL = "gemini-3.8-flash";
export const DEFAULT_QUOTA_FALLBACK_MODEL = "gemini-3.5-flash-lite";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 6000; // includes thinking tokens; the JSON itself is ~1k

export class GeminiFailure extends Error {
  constructor(
    public reason: Exclude<FallbackReason, "unconfigured">,
    message: string,
    public retryAfterMs?: number,
  ) {
    super(message);
    this.name = "GeminiFailure";
  }
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  thinkingLevel: ThinkingLevel | null;
}

export function readGeminiConfig(env: NodeJS.ProcessEnv = process.env): GeminiConfig | null {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const t = (env.GEMINI_THINKING_LEVEL ?? "low").trim().toLowerCase();
  const thinkingLevel =
    t === "off" || t === "default" ? null : t === "minimal" ? ThinkingLevel.MINIMAL : t === "medium" ? ThinkingLevel.MEDIUM : t === "high" ? ThinkingLevel.HIGH : ThinkingLevel.LOW;
  return { apiKey, model: env.GEMINI_MODEL?.trim() || DEFAULT_MODEL, thinkingLevel };
}

/** Minimal surface we use, so tests can inject a fake client. */
export interface GenerateClient {
  models: { generateContent: GoogleGenAI["models"]["generateContent"] };
}

let cachedClient: { key: string; client: GoogleGenAI } | null = null;
function getClient(apiKey: string): GoogleGenAI {
  if (cachedClient?.key !== apiKey) {
    // attempts: 1 => the SDK never auto-retries (retries would burn free quota).
    cachedClient = { key: apiKey, client: new GoogleGenAI({ apiKey, httpOptions: { timeout: REQUEST_TIMEOUT_MS, retryOptions: { attempts: 1 } } }) };
  }
  return cachedClient.client;
}

function parseRetryDelay(err: unknown): number | undefined {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/) || msg.match(/retry in (\d+(?:\.\d+)?)s/i);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) : undefined;
}

export function classifyError(err: unknown): GeminiFailure {
  if (err instanceof GeminiFailure) return err;
  if (err instanceof InvalidOutputError) return new GeminiFailure("invalid_output", err.message);
  if (err instanceof BlockedOutputError) return new GeminiFailure("blocked", err.message);
  const status = err instanceof ApiError ? err.status : undefined;
  const msg = err instanceof Error ? err.message : String(err);
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return new GeminiFailure("quota", "Gemini free-tier quota or rate limit reached", parseRetryDelay(err));
  }
  return new GeminiFailure("unavailable", `Gemini request failed${status ? ` (HTTP ${status})` : ""}`);
}

function extractText(res: GenerateContentResponse): string | undefined {
  if (res.promptFeedback?.blockReason) throw new GeminiFailure("blocked", `Prompt blocked: ${res.promptFeedback.blockReason}`);
  const finish = res.candidates?.[0]?.finishReason;
  if (finish && ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"].includes(String(finish))) {
    throw new GeminiFailure("blocked", `Response blocked: ${finish}`);
  }
  if (finish === "MAX_TOKENS") throw new GeminiFailure("invalid_output", "Response truncated (MAX_TOKENS)");
  return res.text;
}

export async function generateWithGemini(
  fp: Footprint,
  intensity: Intensity,
  config: GeminiConfig,
  client: GenerateClient = getClient(config.apiKey),
): Promise<RoastResult> {
  try {
    const res = await client.models.generateContent({
      model: config.model,
      contents: buildUserPrompt(fp, intensity),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseJsonSchema: roastOutputJsonSchema,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 1,
        ...(config.thinkingLevel ? { thinkingConfig: { thinkingLevel: config.thinkingLevel } } : {}),
      },
    });
    return parseModelOutput(extractText(res), fp);
  } catch (err) {
    throw classifyError(err);
  }
}
