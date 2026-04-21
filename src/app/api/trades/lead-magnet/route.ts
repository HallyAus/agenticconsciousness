import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { sendEmail, notifyAdmin, emailTemplate } from '@/lib/email';
import { TRADE_MAP } from '@/data/trades';
import { CITY_MAP } from '@/data/trade-cities';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ensureTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS trade_leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      business_name text,
      trade_slug text NOT NULL,
      city_slug text,
      user_agent text,
      ip text,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS trade_leads_email_idx ON trade_leads (lower(email))`;
  await sql`CREATE INDEX IF NOT EXISTS trade_leads_trade_city_idx ON trade_leads (trade_slug, city_slug)`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
    const tradeSlug = typeof body.tradeSlug === 'string' ? body.tradeSlug : '';
    const citySlug = typeof body.citySlug === 'string' ? body.citySlug : '';

    if (!EMAIL_REGEX.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
    }
    const trade = TRADE_MAP[tradeSlug];
    if (!trade) return NextResponse.json({ error: 'Unknown trade' }, { status: 400 });
    const city = citySlug ? CITY_MAP[citySlug] : undefined;
    if (citySlug && !city) return NextResponse.json({ error: 'Unknown city' }, { status: 400 });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const ua = req.headers.get('user-agent') || null;

    await ensureTable();
    await sql`
      INSERT INTO trade_leads (email, business_name, trade_slug, city_slug, user_agent, ip)
      VALUES (${email}, ${businessName || null}, ${trade.slug}, ${city?.slug ?? null}, ${ua}, ${ip})
    `;

    const origin = (() => {
      const h = req.headers.get('x-forwarded-host') || req.headers.get('host');
      const proto = req.headers.get('x-forwarded-proto') || 'https';
      return h ? `${proto}://${h}` : 'https://agenticconsciousness.com.au';
    })();

    const pdfUrl = city
      ? `${origin}/api/trades/${trade.slug}/audit-pdf?city=${city.slug}`
      : `${origin}/api/trades/${trade.slug}/audit-pdf`;

    const landingUrl = city
      ? `${origin}/trades/${trade.slug}/${city.slug}`
      : `${origin}/trades/${trade.slug}`;

    const locationLabel = city ? ` — ${city.name}` : '';

    const html = emailTemplate(`
      <h2 class="ac-heading" style="margin:0 0 16px;font-size:22px;font-weight:900;">Your ${trade.name} Website Audit${locationLabel}</h2>
      <p class="ac-body">Hi${businessName ? ' ' + businessName : ''},</p>
      <p class="ac-body">Your ${trade.name} Website Audit${locationLabel} is ready — <a href="${pdfUrl}" style="color:#cc3100;font-weight:700">download the PDF here</a>.</p>
      <p class="ac-body">It&rsquo;s the exact 7-point checklist we run on every ${trade.name.toLowerCase()} site we rebuild. Each check takes about 30 seconds — run them on your current site and you&rsquo;ll know within five minutes where the conversion leaks are.</p>
      <p class="ac-body">If you want a rebuild instead of a DIY, our Lightning Website Sprint is $999 flat and lives in 7 days. <a href="${origin}/book" style="color:#cc3100;font-weight:700">Book a 30-minute discovery call here</a> — no obligation, no sales deck.</p>
      <p class="ac-body">&mdash; Daniel<br/>Agentic Consciousness</p>
      <p class="ac-dim" style="font-size:12px;margin-top:30px">If the PDF link has expired, reopen the audit from <a href="${landingUrl}" style="color:#cc3100">the landing page</a> any time.</p>
    `);

    const sent = await sendEmail({
      to: email,
      subject: `${trade.leadMagnetTitle}${locationLabel}`,
      html,
    });

    // Internal notification (fire-and-forget; never block the response)
    notifyAdmin(
      `Trade lead: ${trade.name}${locationLabel}`,
      `<p><strong>${email}</strong>${businessName ? ' — ' + businessName : ''}</p>
       <p>Trade: ${trade.name}<br/>City: ${city?.name || 'Any'}<br/>IP: ${ip ?? 'unknown'}</p>`
    ).catch(() => void 0);

    return NextResponse.json({ ok: true, emailed: sent });
  } catch (err) {
    console.error('[trades/lead-magnet] error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
