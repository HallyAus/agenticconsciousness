import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const priceIds: Record<string, string> = {
  'claude-workshop': 'price_1TN2frPTv8VxN1HBYRWqlFNG',
  'claude-code-setup': 'price_1TN2fsPTv8VxN1HB4Lf70QAI',
  'ai-stack-audit': 'price_1TN2fxPTv8VxN1HBKqdq3lRa',
  'claude-project-build': 'price_1TN2fyPTv8VxN1HBlMMGkmKM',
  'automation-sprint': 'price_1TN2fyPTv8VxN1HB2pxyAvDL',
  'strategy-deposit': 'price_1TN2fzPTv8VxN1HBIKPTW8YK',
  'implementation-deposit': 'price_1TN2g0PTv8VxN1HBCTqIiDg8',
  'automation-deposit': 'price_1TN2g1PTv8VxN1HBbOfOKGtx',
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

    const price = priceIds[packageId];
    if (!price) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const siteUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price, quantity: 1 }],
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
