import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const packages: Record<string, { name: string; amount: number; description: string }> = {
  'strategy-deposit': {
    name: 'Strategy & Workshops — Deposit',
    amount: 150000,
    description: 'Deposit for AI Strategy & Workshops package. Balance due on delivery.',
  },
  'implementation-deposit': {
    name: 'Tool Implementation — Deposit',
    amount: 250000,
    description: 'Deposit for AI Tool Implementation package. Balance due on delivery.',
  },
  'automation-deposit': {
    name: 'Automation & Agents — Deposit',
    amount: 500000,
    description: 'Deposit for AI Automation & Agents package. Balance due on delivery.',
  },
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    });

    const { packageId, proposalId } = await req.json();

    const selected = packages[packageId];
    if (!selected) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const siteUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: selected.name,
            description: selected.description,
          },
          unit_amount: selected.amount,
        },
        quantity: 1,
      }],
      metadata: {
        packageId,
        proposalId: proposalId || '',
      },
      success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
