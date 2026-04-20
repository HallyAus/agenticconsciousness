import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { notifyAdmin } from '@/lib/email';
import { capturePostHogEvent } from '@/lib/posthog-server';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  : null;

export async function POST(req: NextRequest) {
  try {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Pull line items + expand product data so we get named items in the lead row.
      let lineItems: Array<{
        name: string;
        description?: string;
        amountCents: number;
        quantity: number;
        priceId?: string;
        productId?: string;
      }> = [];
      try {
        const items = await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 50,
          expand: ['data.price.product'],
        });
        lineItems = items.data.map((li) => {
          const price = li.price;
          const product = price && typeof price.product === 'object' && price.product !== null && 'name' in price.product
            ? (price.product as Stripe.Product)
            : null;
          return {
            name: product?.name ?? li.description ?? 'Line item',
            description: typeof product?.description === 'string' ? product.description : undefined,
            amountCents: li.amount_total ?? 0,
            quantity: li.quantity ?? 1,
            priceId: typeof price?.id === 'string' ? price.id : undefined,
            productId: typeof price?.product === 'string'
              ? price.product
              : product?.id ?? undefined,
          };
        });
      } catch (err) {
        console.error('[webhook] listLineItems failed', err instanceof Error ? err.message : err);
      }

      const email = session.customer_details?.email ?? 'unknown';
      const packageIds = session.metadata?.packageIds ?? session.metadata?.packageId ?? '';
      const ref = session.metadata?.ref ?? '';

      const payload = {
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        customerId: typeof session.customer === 'string' ? session.customer : null,
        email,
        name: session.customer_details?.name ?? null,
        phone: session.customer_details?.phone ?? null,
        address: session.customer_details?.address ?? null,
        amountTotal: session.amount_total,
        amountSubtotal: session.amount_subtotal,
        currency: session.currency,
        paymentStatus: session.payment_status,
        packageIds,
        proposalId: session.metadata?.proposalId ?? null,
        subtotalCents: session.metadata?.subtotalCents ?? null,
        gstCents: session.metadata?.gstCents ?? null,
        ref,
        lineItems,
      };

      console.log('\n========== PAYMENT RECEIVED ==========');
      console.log(JSON.stringify({ sessionId: session.id, email, packageIds, amountTotal: session.amount_total, ref }, null, 2));
      console.log('======================================\n');

      await sql`
        INSERT INTO leads (source, email, metadata)
        VALUES (
          'stripe_payment',
          ${email},
          ${JSON.stringify(payload)}::jsonb
        )
      `;

      const dollars = ((session.amount_total || 0) / 100).toLocaleString('en-AU', { minimumFractionDigits: 2 });
      const itemSummary = lineItems.length > 0
        ? lineItems.map((li) => `- ${li.name} x${li.quantity} ($${(li.amountCents / 100).toFixed(2)})`).join('\n')
        : `(no line items)`;

      await notifyAdmin(
        `Payment received: $${dollars} AUD \u2014 ${email}`,
        [
          `Email: ${email}`,
          `Name: ${session.customer_details?.name ?? '-'}`,
          `Phone: ${session.customer_details?.phone ?? '-'}`,
          `Packages: ${packageIds || '-'}`,
          `Ref: ${ref || '-'}`,
          `Total: $${dollars} ${(session.currency || '').toUpperCase()}`,
          `Session: ${session.id}`,
          '',
          'Line items:',
          itemSummary,
        ].join('\n'),
      ).catch((err) => {
        console.error('[webhook] notifyAdmin failed', err instanceof Error ? err.message : err);
      });

      // Close the PostHog funnel. Reuse the client's distinct_id so this
      // Purchase stitches to the same user as their earlier $pageview and
      // InitiateCheckout events. Falls back to email when the id is missing.
      const phDistinctId = session.metadata?.phDistinctId || email;
      await capturePostHogEvent({
        distinctId: phDistinctId,
        event: 'Purchase',
        properties: {
          value: (session.amount_total ?? 0) / 100,
          currency: (session.currency ?? 'aud').toUpperCase(),
          content_name: packageIds || 'unknown',
          num_items: lineItems.length,
          ref: ref || undefined,
          session_id: session.id,
          email,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
