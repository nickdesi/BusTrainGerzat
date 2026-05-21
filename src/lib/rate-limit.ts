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
      const entries = [...tokenCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
      for (const [key] of toDelete) {
        tokenCache.delete(key);
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
