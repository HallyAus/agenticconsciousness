import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';
import fs from 'fs';
import path from 'path';
import { sendEmail, notifyAdmin, emailTemplate } from '@/lib/email';
import { FAST_MODEL } from '@/lib/models';

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

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
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
      model: FAST_MODEL,
      max_tokens: 600,
      system: `Generate 3 quick AI opportunities for a business in the ${industry} sector. Format as a brief, compelling list. Include one specific tool recommendation. Sign off as Agentic Consciousness. Australian English. Keep it under 200 words total.`,
      messages: [
        { role: 'user', content: `Generate an AI opportunity snapshot for a ${industry} business.` },
      ],
    });

    const snapshot = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      JSON.stringify({
        tool: 'exit-capture',
        usage: response.usage,
        stop_reason: response.stop_reason,
        timestamp: new Date().toISOString(),
      })
    );

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

    // Send snapshot to visitor
    await sendEmail({
      to: email,
      subject: 'Your AI Opportunity Snapshot — Agentic Consciousness',
      html: emailTemplate(`
        <p style="color:#e0e0e0">Here's your personalised AI opportunity snapshot for <strong style="color:#fff">${industry.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</strong>:</p>
        <div style="border-left:3px solid #ff3d00;padding-left:16px;margin:20px 0;color:#ccc">${snapshot.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>')}</div>
        <p style="color:#e0e0e0">Want to go deeper? Book a free consultation:</p>
        <a href="mailto:ai@agenticconsciousness.com.au" style="display:inline-block;background:#ff3d00;color:#fff;padding:10px 24px;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;margin-top:8px">BOOK FREE CONSULTATION →</a>
      `),
    });

    // Notify admin
    await notifyAdmin(
      `Exit Intent Lead: ${email} — ${industry}`,
      `Email: ${email}\nIndustry: ${industry}\nSnapshot preview: ${snapshot.slice(0, 200)}`
    );

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error('Exit capture error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
