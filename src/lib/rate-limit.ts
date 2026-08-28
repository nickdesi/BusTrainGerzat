interface RateLimitRecord {
  count: number;
  expiresAt: number;
}

const tokenCache = new Map<string, RateLimitRecord>();
let lastCleanup = Date.now();

const MAX_CACHE_SIZE = 10000;

/**
 * Simple in-memory rate limiter.
 * @param token Unique identifier (e.g., IP address)
 * @param limit Maximum number of requests allowed within the interval
 * @param interval Duration of the rate limit window in milliseconds
 * @returns boolean true if the request is allowed, false if rate limited
 */
export function rateLimit(token: string, limit: number, interval: number): boolean {
  const now = Date.now();

  // Periodic cleanup of expired entries every hour to prevent memory leaks
  if (now - lastCleanup > 3600000) {
    for (const [key, record] of tokenCache.entries()) {
      if (now > record.expiresAt) {
        tokenCache.delete(key);
      }
    }
    if (tokenCache.size > MAX_CACHE_SIZE) {
      // ⚡ Bolt: Avoid Array spread [...entries()] which creates a massive array of arrays.
      // Manually extract and sort to preserve expiresAt logic while reducing GC pressure,
      // and delete directly without intermediate .slice() allocations.
      const entries: { key: string; expiresAt: number }[] = [];
      for (const [key, record] of tokenCache.entries()) {
        entries.push({ key, expiresAt: record.expiresAt });
      }
      entries.sort((a, b) => a.expiresAt - b.expiresAt);

      const toRemove = tokenCache.size - MAX_CACHE_SIZE;
      for (let i = 0; i < toRemove; i++) {
        // eslint-disable-next-line security/detect-object-injection
        tokenCache.delete(entries[i].key);
      }
    }
    lastCleanup = now;
  }

  const record = tokenCache.get(token);

  if (!record) {
    tokenCache.set(token, {
      count: 1,
      expiresAt: now + interval,
    });
    return true;
  }

  if (now > record.expiresAt) {
    record.count = 1;
    record.expiresAt = now + interval;
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}
