import Anthropic from '@anthropic-ai/sdk';
import crypto from 'node:crypto';

/**
 * Generates a "what your site could look like" mockup as a single
 * self-contained HTML document. Claude composes the HTML using the
 * prospect's scraped content + a neural brutalist template direction.
 *
 * The output is stored as-is in prospects.mockup_html and served at
 * /preview/[token]. A ScreenshotOne URL of the rendered page lands in
 * prospects.mockup_screenshot_url for embedding in the PDF + email.
 */

const MODEL = process.env.AI_MOCKUP_MODEL || 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are a senior web designer building a "here's what your new site could look like" mockup for a cold-outreach prospect. You compose COMPLETE, self-contained, production-quality HTML.

HARD RULES

1. Output a single COMPLETE HTML document. Start with <!DOCTYPE html>, end with </html>. All CSS inline in <style> tag. No external fonts, no external images, no external scripts, no fetch/XHR. Fully self-contained.

2. Use ONLY these colours unless the prospect's real brand clearly dictates otherwise:
   - Background: #0a0a0a (black) or #ffffff (white)
   - Ink: #0a0a0a or #ffffff depending on bg
   - Brand red: #ff3d00
   - Soft: #f6f4f2
   No gradients. No soft shadows. Hard geometric blocks.

3. Typography: system stack 'Helvetica Neue', Arial, sans-serif. For monospace kickers use ui-monospace, 'Courier New', monospace. Heavy weights (800-900) for display. Tight letter-spacing on display text (-0.5 to -1px).

4. Layout: mobile-first. Use CSS grid and flexbox. No tables. No Bootstrap. No frameworks.

5. Content sections (required, in this order):
   a. Sticky top bar: business name left, phone + book CTA right
   b. Hero: giant headline, one-line value prop, two CTAs (Call / Book)
   c. Services: 3 to 6 cards with name + 2-line description
   d. Why us: 3 short proof points (local, licensed, on-time etc, pulled from their actual site)
   e. Testimonial (use a real one from their site if available, else omit the whole section)
   f. Coverage / areas: list suburbs or region
   g. Contact: phone, email, hours, physical address if known
   h. Footer: copyright current year, ABN if known

6. NO em-dashes or en-dashes. NO fancy quotes. Only ASCII.

7. The headline MUST be specific to what the business does + who they serve. Never generic.

8. Every CTA button: background #ff3d00, white text, uppercase, letter-spacing 2px, NO border-radius.

9. Phone number should be clickable: tel: link. Email: mailto:. Book: https://agenticconsciousness.com.au/book.

10. Do not include any "built by" or "powered by" text. This is their site.

11. Return ONLY the HTML. No markdown fences, no commentary, no explanation.`;

export interface MockupInput {
  url: string;
  businessName: string | null;
  siteHtml: string;
  issues: Array<{ title: string; detail: string; fix: string }>;
  seo: {
    title?: string | null;
    metaDescription?: string | null;
    h1s?: string[];
    h2s?: string[];
    topKeywords?: Array<{ word: string; count: number }>;
  } | null;
}

export interface MockupResult {
  html: string;
  headline: string | null;
  token: string;
}

const HEADLINE_RE = /<h1[^>]*>([\s\S]*?)<\/h1>/i;

function extractHeadline(html: string): string | null {
  const m = HEADLINE_RE.exec(html);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 140) || null;
}

export async function generateMockup(input: MockupInput): Promise<MockupResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Trim the source HTML to something manageable — we only need the visible
  // copy, nav, headings, contact, services.
  const stripped = input.siteHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18000);

  const seoLines = input.seo
    ? [
        `Title: ${input.seo.title ?? ''}`,
        `Meta description: ${input.seo.metaDescription ?? ''}`,
        `H1s: ${(input.seo.h1s ?? []).slice(0, 5).join(' | ')}`,
        `H2s: ${(input.seo.h2s ?? []).slice(0, 8).join(' | ')}`,
        `Top keywords: ${(input.seo.topKeywords ?? []).map((k) => k.word).slice(0, 10).join(', ')}`,
      ].join('\n')
    : '(no seo extract)';

  const issuesBrief = input.issues
    .slice(0, 5)
    .map((i) => `- ${i.title}: ${i.detail}`)
    .join('\n');

  const userPrompt = `Build the mockup for this prospect.

Prospect URL: ${input.url}
Business name: ${input.businessName ?? '(unknown — infer from site content)'}

SEO extract:
${seoLines}

Top audit findings (for context, so your mockup visibly solves these):
${issuesBrief || '(no findings — design a strong generic improvement)'}

Scraped site copy (sanitised):
${stripped}

Now produce the complete HTML document. Remember: single self-contained file, inline CSS, ASCII only, brand colours only, NO em-dashes. Return HTML only, no preamble.`;

  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 8000,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    },
    { signal: AbortSignal.timeout(180_000) },
  );

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) throw new Error('Mockup generation returned no text');
  let html = textBlock.text.trim();

  // Strip stray markdown fences if Claude cheats
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
  if (!/^<!DOCTYPE\s+html/i.test(html)) {
    throw new Error('Mockup missing DOCTYPE, Claude deviated from prompt');
  }

  return {
    html,
    headline: extractHeadline(html),
    token: crypto.randomBytes(12).toString('hex'),
  };
}
