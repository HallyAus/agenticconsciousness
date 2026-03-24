interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000;
const MAX_PER_MINUTE = 10;
const HOUR_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 50;

const globalRef = globalThis as unknown as { __rateLimitCleanup?: NodeJS.Timeout };
if (!globalRef.__rateLimitCleanup) {
  globalRef.__rateLimitCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < HOUR_MS);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  let entry = store.get(ip);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(ip, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < HOUR_MS);

  const recentMinute = entry.timestamps.filter((t) => now - t < WINDOW_MS);
  if (recentMinute.length >= MAX_PER_MINUTE) {
    const oldestInWindow = recentMinute[0];
    return { allowed: false, retryAfter: Math.ceil((WINDOW_MS - (now - oldestInWindow)) / 1000) };
  }

  if (entry.timestamps.length >= MAX_PER_HOUR) {
    return { allowed: false, retryAfter: 60 };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}
