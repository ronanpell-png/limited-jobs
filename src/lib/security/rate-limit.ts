import { RateLimitError } from "@/lib/errors";

/**
 * Sliding-window rate limiter. Uses Upstash Redis when configured,
 * otherwise an in-memory fallback (fine for single-instance dev/beta).
 */

type LimitDef = { limit: number; windowMs: number };

export const LIMITS = {
  apply_user: { limit: 10, windowMs: 10 * 60 * 1000 },
  apply_ip: { limit: 30, windowMs: 10 * 60 * 1000 },
  upload_user: { limit: 5, windowMs: 60 * 60 * 1000 },
  jobs_list_ip: { limit: 60, windowMs: 60 * 1000 },
  signup_ip: { limit: 5, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, LimitDef>;

export type LimitName = keyof typeof LIMITS;

// ---- In-memory fallback -------------------------------------------------

const memoryBuckets = new Map<string, number[]>();

function memoryCheck(key: string, def: LimitDef): boolean {
  const now = Date.now();
  const cutoff = now - def.windowMs;
  const hits = (memoryBuckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= def.limit) {
    memoryBuckets.set(key, hits);
    return false;
  }
  hits.push(now);
  memoryBuckets.set(key, hits);
  // Opportunistic cleanup to bound memory.
  if (memoryBuckets.size > 10_000) {
    for (const [k, v] of memoryBuckets) {
      if (v.every((t) => t <= cutoff)) memoryBuckets.delete(k);
    }
  }
  return true;
}

// ---- Upstash (lazy-loaded only when configured) --------------------------

type UpstashLimiter = {
  limit: (key: string) => Promise<{ success: boolean }>;
};
const upstashLimiters = new Map<string, UpstashLimiter>();

async function upstashCheck(
  name: string,
  key: string,
  def: LimitDef
): Promise<boolean> {
  let limiter = upstashLimiters.get(name);
  if (!limiter) {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(def.limit, `${def.windowMs} ms`),
      prefix: `rl:${name}`,
    });
    upstashLimiters.set(name, limiter);
  }
  const { success } = await limiter.limit(key);
  return success;
}

// ---- Public API -----------------------------------------------------------

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/** Returns true when the request is allowed. */
export async function checkRateLimit(
  name: LimitName,
  key: string
): Promise<boolean> {
  const def = LIMITS[name];
  if (upstashConfigured()) {
    return upstashCheck(name, key, def);
  }
  return memoryCheck(`${name}:${key}`, def);
}

/** Throws RateLimitError when the request is not allowed. */
export async function enforceRateLimit(
  name: LimitName,
  key: string
): Promise<void> {
  const allowed = await checkRateLimit(name, key);
  if (!allowed) throw new RateLimitError();
}

/** Test-only: reset in-memory buckets between tests. */
export function __resetMemoryRateLimits() {
  memoryBuckets.clear();
}
