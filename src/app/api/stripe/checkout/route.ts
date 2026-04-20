import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

interface Pkg {
  priceId?: string;      // Stripe dashboard Price ID if present
  baseCents: number;
  name?: string;         // required when priceId is absent (inline price_data)
  description?: string;
}

const packages: Record<string, Pkg> = {
  // ── Consulting packages (dashboard products) ──
  'claude-workshop':        { priceId: 'price_1TN2frPTv8VxN1HBYRWqlFNG', baseCents: 30000 },
  'claude-code-setup':      { priceId: 'price_1TN2fsPTv8VxN1HB4Lf70QAI', baseCents: 45000 },
  'ai-stack-audit':         { priceId: 'price_1TN2fxPTv8VxN1HBKqdq3lRa', baseCents: 50000 },
  'claude-project-build':   { priceId: 'price_1TN2fyPTv8VxN1HBlMMGkmKM', baseCents: 75000 },
  'automation-sprint':      { priceId: 'price_1TN2fyPTv8VxN1HB2pxyAvDL', baseCents: 150000 },
  'strategy-deposit':       { priceId: 'price_1TN2fzPTv8VxN1HBIKPTW8YK', baseCents: 150000 },
  'implementation-deposit': { priceId: 'price_1TN2g0PTv8VxN1HBCTqIiDg8', baseCents: 250000 },
  'automation-deposit':     { priceId: 'price_1TN2g1PTv8VxN1HBbOfOKGtx', baseCents: 500000 },

  // ── Website Sprint base (dashboard product) ──
  'website-sprint':         { priceId: 'price_1TO4woPTv8VxN1HBlY6cCy8z', baseCents: 99900 },

  // ── Website Sprint extras (dashboard products) ──
  'extra-page':           { priceId: 'price_1TO58lPTv8VxN1HB4aDSAuLX', baseCents: 10000 },
  'blog-cms':             { priceId: 'price_1TO58mPTv8VxN1HBlPYS3HBb', baseCents: 40000 },
  'multi-language':       { priceId: 'price_1TO58nPTv8VxN1HBt5lWNTKl', baseCents: 30000 },
  'stripe-integration':   { priceId: 'price_1TO58oPTv8VxN1HBFcxPwbro', baseCents: 30000 },
  'ecommerce-catalog':    { priceId: 'price_1TO58pPTv8VxN1HBFSVzZKsZ', baseCents: 50000 },
  'booking-integration':  { priceId: 'price_1TO58qPTv8VxN1HBg3lmFk9c', baseCents: 20000 },
  'auth-integration':     { priceId: 'price_1TO58rPTv8VxN1HBHdsyJwLB', baseCents: 50000 },
  'contact-form':         { priceId: 'price_1TO58sPTv8VxN1HB9Plitw4K', baseCents: 15000 },
  'extra-copywriting':    { priceId: 'price_1TO58tPTv8VxN1HB2lD7y5Ym', baseCents: 10000 },
  'chatbot-training':     { priceId: 'price_1TO58uPTv8VxN1HBHvPSTa5D', baseCents: 30000 },
  'ga4-gtm':              { priceId: 'price_1TO58vPTv8VxN1HBN1mVVBs2', baseCents: 15000 },
  'posthog-setup':        { priceId: 'price_1TO58wPTv8VxN1HB6psjvWsr', baseCents: 15000 },
  'seo-deep':             { priceId: 'price_1TO58xPTv8VxN1HBGAyAMbSX', baseCents: 25000 },
  'design-polish':        { priceId: 'price_1TO58yPTv8VxN1HB79V1hVRy', baseCents: 40000 },
};

const GST_RATE = 0.1;

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  : null;

function buildLineItems(ids: string[]) {
  const found: Array<{ id: string; pkg: Pkg }> = [];
  const missing: string[] = [];
  for (const id of ids) {
    const pkg = packages[id];
    if (!pkg) { missing.push(id); continue; }
    found.push({ id, pkg });
  }
  return { found, missing };
}

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
    const body = await req.json();
    const proposalId: string | undefined = body.proposalId;
    const rawRef: unknown = body.ref;
    const ref = typeof rawRef === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(rawRef) ? rawRef : '';

    // Accept either a single packageId or an array of packageIds.
    const rawIds: string[] = Array.isArray(body.packageIds)
      ? body.packageIds
      : body.packageId
        ? [body.packageId]
        : [];

    if (rawIds.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }
    if (rawIds.length > 20) {
      return NextResponse.json({ error: 'Too many items' }, { status: 400 });
    }

    const { found, missing } = buildLineItems(rawIds);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Unknown package: ${missing.join(', ')}` }, { status: 400 });
    }

    const siteUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';

    // Build Stripe line items. Dashboard products use `price`; extras use `price_data`.
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = found.map(({ pkg }) => {
      if (pkg.priceId) {
        return { price: pkg.priceId, quantity: 1 };
      }
      return {
        price_data: {
          currency: 'aud',
          product_data: {
            name: pkg.name ?? 'Extra',
            description: pkg.description,
          },
          unit_amount: pkg.baseCents,
        },
        quantity: 1,
      };
    });

    // One combined GST line item over the whole cart.
    const subtotalCents = found.reduce((sum, { pkg }) => sum + pkg.baseCents, 0);
    const gstCents = Math.round(subtotalCents * GST_RATE);
    lineItems.push({
      price_data: {
        currency: 'aud',
        product_data: {
          name: 'GST (10%)',
          description: 'Australian Goods and Services Tax',
        },
        unit_amount: gstCents,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      metadata: {
        packageIds: found.map((f) => f.id).join(','),
        proposalId: proposalId || '',
        subtotalCents: String(subtotalCents),
        gstCents: String(gstCents),
        ref,
      },
      success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/extras`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
