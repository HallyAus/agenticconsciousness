import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';
import { notifyAdmin } from '@/lib/email';
import { sql } from '@/lib/pg';

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    await sql`
      INSERT INTO leads (source, email, name, phone, message, recommended_service)
      VALUES ('contact', ${email}, ${name}, ${phone ?? null}, ${message ?? null}, ${recommendedService ?? null})
    `;

    console.log('[contact] new lead:', { name, email, recommendedService });

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
