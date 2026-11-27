/**
 * Best-effort, in-memory sliding-window rate limiter. On serverless hosts each
 * instance has its own memory, so this is a guardrail against bursts and
 * casual abuse, not a hard global limit (see README). It needs no database.
 */
export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(private rules: RateLimitRule[], private maxKeys = 5000) {}

  check(key: string, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
    const longest = Math.max(...this.rules.map((r) => r.windowMs));
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < longest);

    for (const rule of this.rules) {
      const inWindow = list.filter((t) => now - t < rule.windowMs);
      if (inWindow.length >= rule.limit) {
        const retryAfterSec = Math.max(1, Math.ceil((inWindow[0] + rule.windowMs - now) / 1000));
        this.hits.set(key, list);
        return { ok: false, retryAfterSec };
      }
    }

    list.push(now);
    this.hits.delete(key);
    this.hits.set(key, list);
    if (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    return { ok: true };
  }
}

export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  return ip.slice(0, 64);
}
