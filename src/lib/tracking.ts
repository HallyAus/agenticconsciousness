/* eslint-disable @typescript-eslint/no-explicit-any */
export function trackEvent(eventName: string, params?: Record<string, string | number>) {
  if (typeof window === 'undefined') return;

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
