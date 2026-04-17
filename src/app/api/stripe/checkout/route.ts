import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

interface Pkg {
  priceId: string;
  baseCents: number;
}

const packages: Record<string, Pkg> = {
  'claude-workshop':      { priceId: 'price_1TN2frPTv8VxN1HBYRWqlFNG', baseCents: 30000 },
  'claude-code-setup':    { priceId: 'price_1TN2fsPTv8VxN1HB4Lf70QAI', baseCents: 45000 },
  'ai-stack-audit':       { priceId: 'price_1TN2fxPTv8VxN1HBKqdq3lRa', baseCents: 50000 },
  'claude-project-build': { priceId: 'price_1TN2fyPTv8VxN1HBlMMGkmKM', baseCents: 75000 },
  'automation-sprint':    { priceId: 'price_1TN2fyPTv8VxN1HB2pxyAvDL', baseCents: 150000 },
  'strategy-deposit':     { priceId: 'price_1TN2fzPTv8VxN1HBIKPTW8YK', baseCents: 150000 },
  'implementation-deposit': { priceId: 'price_1TN2g0PTv8VxN1HBCTqIiDg8', baseCents: 250000 },
  'automation-deposit':   { priceId: 'price_1TN2g1PTv8VxN1HBbOfOKGtx', baseCents: 500000 },
};

const GST_RATE = 0.1;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  : null;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
  }

  try {

    const { packageId, proposalId } = await req.json();

    const pkg = packages[packageId];
    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    const siteUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
    const gstCents = Math.round(pkg.baseCents * GST_RATE);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        { price: pkg.priceId, quantity: 1 },
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'GST (10%)',
              description: 'Australian Goods and Services Tax',
            },
            unit_amount: gstCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        packageId,
        proposalId: proposalId || '',
        gstCents: String(gstCents),
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
