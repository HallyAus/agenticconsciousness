/**
 * Server-side PostHog capture. One-shot fetch to the /capture endpoint —
 * avoids pulling in posthog-node for a single event.
 *
 * Pass the client's distinct_id (captured at checkout and threaded through
 * Stripe metadata) so Visit → InitiateCheckout → Purchase stitch to the
 * same user in the funnel. Without it, Purchase lands under a new
 * anonymous id and the funnel stays broken.
 */
export async function capturePostHogEvent({
  distinctId,
  event,
  properties,
}: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey || !distinctId) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: { ...(properties ?? {}), $lib: 'agentic-consciousness-server' },
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error('[posthog] server capture failed', err instanceof Error ? err.message : err);
  }
}
