import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { rateLimitInMemory } from "@/server/http/rateLimitMemory";

let redisClient: Redis | null | undefined;
const upstashLimiters = new Map<string, Ratelimit>();

const getRedis = (): Redis | null => {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN missing: limits are per-instance and in memory.",
      );
    }
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
};

const getUpstashLimiter = (limit: number, windowMs: number): Ratelimit | null => {
  const redis = getRedis();
  if (!redis) return null;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const cacheKey = `${limit}:${windowSec}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "voxer:rl",
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
};

export const rateLimit = async (key: string, limit: number, windowMs: number): Promise<boolean> => {
  const upstash = getUpstashLimiter(limit, windowMs);
  if (upstash) {
    try {
      const { success } = await upstash.limit(key);
      return success;
    } catch (e) {
      // Upstash down or out of quota: the in-memory limit is weaker but keeps routes working.
      console.error(
        "[rateLimit] Upstash failed, using memory:",
        e instanceof Error ? e.message : e,
      );
    }
  }
  return rateLimitInMemory(key, limit, windowMs);
};
