import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const packages: Record<string, { name: string; amount: number; description: string }> = {
  // Quick-start offers — pay in full
  'claude-workshop': {
    name: 'Claude Workshop',
    amount: 30000,
    description: '90-minute 1:1 Claude onboarding — Projects, Artifacts, Computer Use, role-specific prompts. Includes recording and 14-day follow-up support.',
  },
  'claude-code-setup': {
    name: 'Claude Code Setup',
    amount: 45000,
    description: 'Install and configure Claude Code with IDE integration, custom slash commands, CLAUDE.md tailored to your repo, 30-day tuning support.',
  },
  'ai-stack-audit': {
    name: 'AI Stack Audit',
    amount: 50000,
    description: '2-hour workflow review plus written report with prioritised quick wins and a 12-month AI roadmap. Includes 30-minute findings walkthrough.',
  },
  'claude-project-build': {
    name: 'Custom Claude Project Build',
    amount: 75000,
    description: 'Bespoke Claude Project with context files, instructions, knowledge base, and prompt evaluation against real tasks. Includes admin guide.',
  },
  'automation-sprint': {
    name: 'Automation Sprint',
    amount: 150000,
    description: 'One production-ready automation built end-to-end — n8n, Make, Zapier, or custom API. Deployed, documented, 14-day post-launch support.',
  },
  // Full engagement deposits
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
