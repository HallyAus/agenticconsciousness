import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/parseAiJson';

const MODEL = 'claude-sonnet-4-6';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const AUDIT_SYSTEM = `You are a senior conversion + technical web auditor for Agentic Consciousness, an Australian AI consulting firm.

Given the HTML of a live website, produce a focused audit highlighting 6\u201310 specific issues that matter for conversion, trust, and professional presentation. Prioritise problems that hurt real-world outcomes over theoretical best-practice nitpicks.

Look at (in order of importance):
1. Conversion clarity \u2014 primary CTA visible in the first 400px? Value prop clear in 5 seconds? Jargon overload?
2. Trust signals \u2014 real testimonials, proof, contact info, AU business credibility
3. Mobile \u2014 viewport tag, responsive images, touch targets, no horizontal scroll hints
4. SEO basics \u2014 <title>, meta description, single <h1>, canonical, schema
5. Accessibility \u2014 alt text on meaningful images, heading order, form labels
6. Performance hints \u2014 render-blocking CSS/JS, unoptimised images, font loading
7. Design professionalism \u2014 typography discipline, whitespace, colour consistency
8. AI / modernisation opportunity \u2014 one concrete place AI could help this specific site

Return valid JSON only, no markdown:
{
  "summary": "Two sentences: overall verdict plus the single biggest opportunity",
  "score": 0-100,
  "issues": [
    {
      "category": "Conversion | Trust | Mobile | SEO | Accessibility | Performance | Design | AI",
      "severity": "critical | high | medium | low",
      "title": "5\u20138 word headline for the issue",
      "detail": "2 sentences: what is wrong and why it hurts conversion or trust. Reference actual elements from the HTML.",
      "fix": "One concrete sentence describing the fix."
    }
  ]
}

Rules:
- Be specific to the HTML you see. Quote actual tag names, class names, or copy where relevant.
- Australian English spelling.
- No generic advice. Every finding must tie to something you saw.
- Direct, confident tone. No hedging.
- If the site is genuinely great, return fewer issues with honest severity \u2014 do not invent problems.`;

function sanitiseHtml(raw: string): string {
  // Drop scripts, styles, and SVG bodies \u2014 not useful for audit, wastes tokens.
  let out = raw;
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<svg[\s\S]*?<\/svg>/gi, '<svg/>');
  out = out.replace(/<!--([\s\S]*?)-->/g, '');
  // Collapse whitespace
  out = out.replace(/\s+/g, ' ').trim();
  // Cap at 30k chars (~7.5k tokens) so we stay well within budget.
  if (out.length > 30000) out = out.slice(0, 30000) + '\n\n[\u2026TRUNCATED\u2026]';
  return out;
}

function normaliseUrl(input: string): URL | null {
  try {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const u = new URL(withScheme);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    // Block internal / loopback hosts.
    const host = u.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)) return null;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
    if (host.endsWith('.internal') || host.endsWith('.local')) return null;
    return u;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Enter your website URL.' }, { status: 400 });
    }
    const u = normaliseUrl(url);
    if (!u) {
      return NextResponse.json({ error: 'That URL does not look valid. Try https://yourdomain.com.' }, { status: 400 });
    }

    // Fetch the page with a hard timeout + size cap.
    let html: string;
    try {
      const res = await fetch(u.toString(), {
        redirect: 'follow',
        headers: {
          'User-Agent': 'AgenticConsciousnessAuditBot/1.0 (+https://agenticconsciousness.com.au)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return NextResponse.json({ error: `Could not fetch the site (HTTP ${res.status}).` }, { status: 400 });
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 2_000_000) {
        return NextResponse.json({ error: 'Site HTML too large to analyse (>2MB).' }, { status: 400 });
      }
      html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: `Could not reach the site: ${msg}` }, { status: 400 });
    }

    const stripped = sanitiseHtml(html);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: [{ type: 'text', text: AUDIT_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `URL: ${u.toString()}\n\nHTML (sanitised):\n\n${stripped}`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    let parsed: Record<string, unknown>;
    try {
      const raw = parseAiJson(text);
      if (!raw || typeof raw !== 'object') throw new Error('not an object');
      parsed = raw as Record<string, unknown>;
    } catch (err) {
      console.error('Website audit parse error:', err instanceof Error ? err.message : err);
      console.error('Raw text:', text);
      return NextResponse.json({ error: 'The AI produced an unexpected response. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ url: u.toString(), ...parsed });
  } catch (error) {
    console.error('Website audit error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Audit failed. Try again.' }, { status: 500 });
  }
}
