import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';
import { notifyAdmin } from '@/lib/email';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  try {
    const { name, email, phone, message, recommendedService } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const submission = {
      timestamp: new Date().toISOString(),
      name,
      email,
      phone: phone || null,
      recommendedService: recommendedService || null,
      message: message || null,
    };

    // Log to console (visible in docker logs)
    console.log('\n========== NEW LEAD ==========');
    console.log(JSON.stringify(submission, null, 2));
    console.log('==============================\n');

    // Also append to a leads file for persistence
    const leadsDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(leadsDir)) fs.mkdirSync(leadsDir, { recursive: true });

    const leadsFile = path.join(leadsDir, 'leads.jsonl');
    fs.appendFileSync(leadsFile, JSON.stringify(submission) + '\n');

    await notifyAdmin(
      `New Lead: ${name} — ${email}`,
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nService: ${recommendedService || 'N/A'}\nMessage: ${message || 'N/A'}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
