type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const PRUNE_THRESHOLD = 5_000;
/** Hard cap: with many distinct IPs inside the window, pruning expired buckets is not enough. */
const MAX_BUCKETS = 50_000;

/** Pruning is O(n); doing it on every insert would be quadratic under a flood of new IPs. */
const PRUNE_MIN_INTERVAL_MS = 1_000;
let lastPruneAt = 0;

const pruneExpiredBuckets = (now: number): void => {
  lastPruneAt = now;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
};

export const rateLimitMemoryBucketCount = (): number => buckets.size;

export const rateLimitInMemory = (key: string, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    if (buckets.size >= PRUNE_THRESHOLD && now - lastPruneAt >= PRUNE_MIN_INTERVAL_MS) {
      pruneExpiredBuckets(now);
    }
    if (buckets.size >= MAX_BUCKETS) {
      // Maps iterate in insertion order, so the oldest keys go first.
      const excess = buckets.size - MAX_BUCKETS + 1;
      let dropped = 0;
      for (const oldKey of buckets.keys()) {
        if (dropped >= excess) break;
        buckets.delete(oldKey);
        dropped += 1;
      }
    }
    b = { count: 1, resetAt: now + windowMs };
    buckets.set(key, b);
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
};
