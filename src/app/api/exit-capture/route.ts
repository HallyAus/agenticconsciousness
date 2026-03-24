import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import fs from 'fs';
import path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const VALID_INDUSTRIES = [
  'Manufacturing',
  'Professional Services',
  'Construction & Trades',
  'Healthcare',
  'Retail & E-commerce',
  'Finance & Insurance',
  'Education',
  'Hospitality & Tourism',
  'Technology',
  'Government',
  'Transport & Logistics',
  'Agriculture',
  'Other',
];

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${retryAfter}s.` },
      { status: 429 }
    );
  }

  try {
    const { email, industry } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (!industry || !VALID_INDUSTRIES.includes(industry)) {
      return NextResponse.json({ error: 'Valid industry required' }, { status: 400 });
    }

    // Generate AI opportunity snapshot
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: `Generate 3 quick AI opportunities for a business in the ${industry} sector. Format as a brief, compelling list. Include one specific tool recommendation. Sign off as Agentic Consciousness. Australian English. Keep it under 200 words total.`,
      messages: [
        { role: 'user', content: `Generate an AI opportunity snapshot for a ${industry} business.` },
      ],
    });

    const snapshot = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Log the lead
    const lead = {
      timestamp: new Date().toISOString(),
      email,
      industry,
      source: 'exit-intent',
      snapshot: snapshot.slice(0, 200),
    };

    console.log('\n========== EXIT INTENT LEAD ==========');
    console.log(JSON.stringify(lead, null, 2));
    console.log('=======================================\n');

    // Persist to file
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.appendFileSync(
      path.join(dataDir, 'leads.jsonl'),
      JSON.stringify({ ...lead, snapshot }) + '\n'
    );

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Exit capture error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
