import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { notifyAdmin } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    });

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

      const payment = {
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        customerEmail: session.customer_details?.email,
        amount: session.amount_total,
        currency: session.currency,
        packageId: session.metadata?.packageId,
        proposalId: session.metadata?.proposalId,
        status: session.payment_status,
      };

      console.log('\n========== PAYMENT RECEIVED ==========');
      console.log(JSON.stringify(payment, null, 2));
      console.log('======================================\n');

      await sql`
        INSERT INTO leads (source, email, metadata)
        VALUES (
          'stripe_payment',
          ${session.customer_details?.email ?? 'unknown'},
          ${JSON.stringify(payment)}::jsonb
        )
      `;

      await notifyAdmin(
        `Payment Received: ${session.metadata?.packageId} — $${((session.amount_total || 0) / 100).toLocaleString()}`,
        `Email: ${session.customer_details?.email}\nPackage: ${session.metadata?.packageId}\nAmount: $${((session.amount_total || 0) / 100).toLocaleString()} ${session.currency?.toUpperCase()}\nSession: ${session.id}`
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
