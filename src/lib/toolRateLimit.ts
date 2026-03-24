const STORAGE_KEY = 'ac-tool-uses';
const MAX_USES = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

interface RateLimitState {
  count: number;
  resetAt: number;
}

export function getRateLimitState(): RateLimitState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: RateLimitState = JSON.parse(raw);
      if (Date.now() < parsed.resetAt) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return { count: 0, resetAt: Date.now() + WINDOW_MS };
}

export function incrementRateLimit(): RateLimitState {
  const state = getRateLimitState();
  const next: RateLimitState = { count: state.count + 1, resetAt: state.resetAt };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function usesRemaining(): number {
  const state = getRateLimitState();
  return Math.max(0, MAX_USES - state.count);
}

export const MAX_TOOL_USES = MAX_USES;
