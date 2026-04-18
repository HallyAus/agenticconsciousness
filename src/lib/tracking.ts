/* eslint-disable @typescript-eslint/no-explicit-any */
import posthog from 'posthog-js';

export function trackEvent(eventName: string, params?: Record<string, string | number>) {
  if (typeof window === 'undefined') return;

  // PostHog
  if (posthog && typeof posthog.capture === 'function') {
    try {
      posthog.capture(eventName, params);
    } catch {
      // PostHog not initialised yet (provider loads lazily) \u2014 swallow
    }
  }

  // Meta Pixel
  if ((window as any).fbq) {
    (window as any).fbq('track', eventName, params);
  }

  // Google Ads
  if ((window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }

  // Console log for debugging
  console.log(JSON.stringify({ event: 'tracking', eventName, params, timestamp: new Date().toISOString() }));
}
