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

  // ── Website Sprint extras (inline price_data at checkout) ──
  'extra-page':         { baseCents: 10000, name: 'Extra page',               description: 'Additional page beyond the 3 included in the sprint.' },
  'blog-cms':           { baseCents: 40000, name: 'Blog / CMS',               description: 'Admin UI, draft/publish workflow, Article schema, RSS.' },
  'multi-language':     { baseCents: 30000, name: 'Multi-language',           description: 'English plus one additional language with hreflang + translated copy.' },
  'stripe-integration': { baseCents: 30000, name: 'Stripe checkout',          description: 'Live Stripe integration with GST line item and tax-invoice emails.' },
  'ecommerce-catalog':  { baseCents: 50000, name: 'E-commerce catalog',       description: 'Up to 20 products, Stripe checkout, inventory, order emails.' },
  'booking-integration':{ baseCents: 20000, name: 'Booking / calendar',       description: 'Cal.com or Calendly embed with timezone-aware confirmations.' },
  'auth-integration':   { baseCents: 50000, name: 'User accounts + auth',     description: 'Email/password or magic-link auth, protected pages, password reset.' },
  'contact-form':       { baseCents: 15000, name: 'Contact form + auto-reply',description: 'Validated form, anti-spam, auto-reply, stored in Neon Postgres.' },
  'extra-copywriting':  { baseCents: 10000, name: 'Extra copywriting',        description: 'Per-page bespoke copy \u2014 researched, drafted, on-brand.' },
  'chatbot-training':   { baseCents: 30000, name: 'AI chatbot deep training', description: 'Claude Project trained on your docs, FAQs, product catalogue, policies.' },
  'ga4-gtm':            { baseCents: 15000, name: 'Google Analytics 4 + GTM', description: 'GA4 install, GTM container, conversion events, e-commerce tracking.' },
  'posthog-setup':      { baseCents: 15000, name: 'PostHog product analytics',description: 'Session replay, autocapture, funnels, pre-built dashboard.' },
  'seo-deep':           { baseCents: 25000, name: 'SEO deep optimisation',    description: 'Keyword research, on-page tuning, internal linking, llms.txt.' },
  'design-polish':      { baseCents: 40000, name: 'Advanced design polish',   description: 'Custom animations, scroll interactions, bespoke icons, Lottie.' },
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
