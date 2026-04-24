import Anthropic from '@anthropic-ai/sdk';

/**
 * Generates a "what your site could look like" mockup as a single
 * self-contained HTML document. Claude composes the HTML using the
 * prospect's real content: their logo, brand colours sampled from that
 * logo, up to 6 real content images hotlinked from their site, and
 * real Google reviews pulled from Place Details.
 *
 * The output is stored as-is in prospects.mockup_html and served at
 * /preview/[token]. A ScreenshotOne URL of the rendered page lands in
 * prospects.mockup_screenshot_url for embedding in the PDF + email.
 *
 * Token identity: the token belongs to the PROSPECT, not the mockup —
 * once assigned it must never rotate, or already-sent outreach emails
 * 404. Token minting lives in the caller (audit-enrich), not here.
 */

const MODEL = process.env.AI_MOCKUP_MODEL || 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are a senior web designer + conversion copywriter building a "here is what your new site could look like" mockup for a cold-outreach prospect. You compose COMPLETE, self-contained, production-quality HTML that is simultaneously tight on conversion, strong on brand, and heavily optimised for both traditional SEO and AI-answer-engine (AEO) surfaces.

## OUTPUT FORMAT

Output a single COMPLETE HTML document. Start with <!DOCTYPE html>, end with </html>. Inline all CSS in <style>. ONE script tag is allowed, only for JSON-LD. No external fonts, no external JS libraries. External images ARE allowed and expected (the caller provides a vetted list of hotlink URLs — USE them exactly as given).

Return ONLY the HTML. No markdown fences, no commentary, no explanation.

## COLOUR MODE — ALWAYS LIGHT. NON-NEGOTIABLE.

This is the single most important rule. Previous generations with the same input have defaulted to a dark colour scheme and had to be thrown out. DO NOT do that. The page background is WHITE. Text is BLACK on white. Full stop.

Specifically DISALLOWED — do not use ANY of these as a section background or as the page body background:
- #000000, #0a0a0a, #111111, #121212, #1a1a1a, #1f1f1f, #222222
- Any hex code where all three RGB channels are below 0x40
- Any CSS named colour "black", "charcoal", "midnight", "onyx"
- Any gradient that starts or ends on a dark colour

If the caller provides "Brand colours", those override ONLY the accent slot (CTA buttons, kickers, underlines, thin rules). Even if the brand has a black logo, the PAGE is still white — the accent stays on small elements. If no brand colours are provided, use #ff3d00 as the accent.

Base palette (never change):
- Page background: #ffffff (white). The dominant surface everywhere.
- Section alternating background: #f6f4f2 (warm neutral) — for breaking up zones only. NEVER dark.
- Ink / body text: #0a0a0a on white.
- Subtle rule lines: #eeeeee or #d4d4d4.
- Accent: brand primary colour if given, else #ff3d00.

Sanity check before you output: grep your own HTML for "background:#0", "background-color:#0", "background: #0", "bg:#0", or any six-digit hex whose first two characters are in [0-3]. If any match a body/section/container selector, DELETE that rule or change to #ffffff / #f6f4f2. Do this check mentally before writing the final answer.

No gradients. No soft shadows. Hard geometric blocks only.

## TYPOGRAPHY

System stack: 'Helvetica Neue', Arial, sans-serif. For monospace kickers: ui-monospace, 'Courier New', monospace. Heavy weights (800-900) for display. Tight letter-spacing on display text (-0.5 to -1px). Body text 16-17px, line-height 1.5-1.65.

## LAYOUT

Mobile-first. CSS grid + flexbox only. No tables for layout. No Bootstrap. No frameworks. Max content width around 1200px. Generous vertical rhythm (min 80px between major sections on desktop, 56px mobile).

## REQUIRED SECTIONS (IN THIS ORDER)

Every mockup MUST include these in this order. Skip only the ones explicitly flagged below.

1. **Sticky top bar** — logo left (use the provided logo URL if given; otherwise business-name wordmark), phone link + a single "BOOK" CTA on the right. Stays fixed on scroll.

2. **Hero** — MUST be above the fold. Giant specific headline (max 10 words, tells the visitor exactly what you do + who you serve + the local area), one sub-line of value prop, TWO distinct CTAs side-by-side: "CALL NOW" (tel:) and "BOOK ONLINE" (the booking link). Include a real hero image from the provided image list, placed to the right on desktop or below the copy on mobile.

3. **Trust row** — a single horizontal strip directly under the hero with 3-5 terse proof points (e.g. "Licensed", "Insured", "Local since 2008", "4.9/5 on Google", "On-time or free"). Use the provided Google rating + review count if available. This is high-CRO — do not skip.

4. **Services** — 3-6 cards in a grid. Each card: service name (h3), 2-3 line description, small outcome-focused benefit line. Use a small content image per card from the provided image list if you have enough.

5. **Social proof section** — if Google reviews are provided, use them as a testimonial grid (2-3 visible, each with author, star rating, text, "— from Google"). If no Google reviews, pull the most credible testimonial from their site. If neither, OMIT this section entirely — never fabricate.

6. **Why us** — 3 short proof points pulled from their actual site copy (years in business, certifications, guarantees, local connection).

7. **Service area / Coverage** — list the suburbs or region they serve. Use real text from their site.

8. **FAQ** — 3-5 real Q&A pairs relevant to the business. Infer from their site content, common customer objections, and the business category. Each Q is a <h3>, each A is a <p>. This section drives AEO (Google AI Overviews + ChatGPT cite FAQ schemas heavily) — make it substantive, not filler.

9. **Contact** — phone (tel:), email (mailto:), physical address if known, hours if known.

10. **Footer** — copyright current year, ABN if known. Micro nav with Privacy, Terms links.

## CTAs

Every CTA button: dominant-accent background, white text, uppercase, letter-spacing 2px, NO border-radius. Buttons on light backgrounds get a solid fill; never outline-only. The primary CTA ("BOOK") appears at least 3 times on the page: sticky bar, hero, and bottom of page.

Phone = tel: link. Email = mailto: link. Booking link = https://agenticconsciousness.com.au/book.

## IMAGES

Use ONLY URLs the caller provides in the "Images" list. Do NOT invent image URLs. Do NOT use Unsplash, Pexels, Pixabay, or any other stock photo source. Do NOT use photos of people from any source. For each image: wrap in a container with \`object-fit: cover\`, fixed aspect ratio, and \`loading="lazy"\` + \`decoding="async"\` on the img tag. Always include a descriptive alt attribute.

When the Images list has fewer items than the layout needs (e.g. only 1 logo provided but you've designed 4 service cards), DO NOT leave the remaining cards image-less. Instead, render a brutalist CSS placeholder block in place of an image:

\`\`\`html
<div class="card-visual" aria-hidden="true" style="aspect-ratio: 4/3; background: linear-gradient(135deg, var(--brand-1, #ff3d00) 0%, var(--brand-2, #1a1a1a) 100%); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.85); font-family: system-ui, sans-serif; font-weight: 900; font-size: clamp(1.4rem, 3vw, 2.2rem); letter-spacing: 2px; text-transform: uppercase; text-align: center; padding: 1.5rem;">
  [SHORT SERVICE LABEL — 1 to 3 words]
</div>
\`\`\`

Use the brand's actual primary + secondary colours in the gradient (the caller provides them). The label inside the block is the service name from THAT card (e.g. "Switchboard Upgrades", "EV Charger Install", "Ceiling Fans"). NO stock photos, NO photos of people, NO emoji icons in placeholders — just the gradient + the trade-specific text label.

## LOGO

If a logo URL is provided, place it in the sticky top bar (max-height 36-44px). Do not embed it in the hero or as a repeated watermark.

## AEO + SEO REQUIREMENTS (non-optional)

- Semantic HTML: <header>, <main>, <section>, <article>, <footer>. Every section has a single <h2> heading. Hero uses <h1>.
- Every image has descriptive alt text referencing the business category + service.
- Embed a single inline <script type="application/ld+json"> containing a LocalBusiness JSON-LD object with: @type LocalBusiness (or a more specific type like Electrician/Plumber/Roofer if you can tell), name, url, telephone, image (logo URL), address (PostalAddress), areaServed (as array of city names if known), aggregateRating (use the provided Google rating + review count if given, else omit the entire aggregateRating field), and a "sameAs" array with social profile URLs if they appear in the scraped copy.
- If the FAQ section has 3+ Q&As, add a SECOND <script type="application/ld+json"> containing an FAQPage JSON-LD with the exact FAQ copy.
- Meta tags in <head>: title (50-60 chars, business + service + location), meta description (150-160 chars, unique value prop + call to action), canonical, robots "index,follow", viewport width=device-width initial-scale=1, og:title, og:description, og:image (use the logo if no hero image), og:type "website", og:url.
- Add a CSS class "speakable" on the hero <h1>, on the hero value-prop <p>, and on each FAQ answer. Add <style>.speakable{}</style> (empty is fine) + reference those selectors from a \`SpeakableSpecification\` inside the LocalBusiness JSON-LD.
- No lorem ipsum. No "[insert X]" placeholders. Every word on the page is either real copy from the prospect or a credible paraphrase.

## CRO REQUIREMENTS (non-optional)

- Above the fold: business name + specific headline + value prop + two CTAs + one image + trust signal must all be visible on a typical 1440×900 desktop viewport.
- Objection-killers inside service cards: address "how much does this cost", "how long does it take", "do you guarantee" where relevant.
- Urgency without fake scarcity: reference real signals (same-day quotes, emergency call-outs, slot availability).
- The first paragraph below the hero answers: "Why you, specifically, right now?"
- Mobile: CTAs remain visible as sticky elements; bottom-of-screen CTA bar on mobile if space permits.

## HARD PROHIBITIONS

- NO em-dashes (—) or en-dashes (–). Use comma, period, or colon.
- No fancy quotes ("" '' ). Use ASCII " and '.
- No "built by" / "powered by" / "mockup by" copy. This is their site.
- No fabricated reviews or testimonials. If we didn't give you a Google review and their site has no testimonial, skip the testimonial section.
- No invented phone numbers, emails, ABNs, or addresses. Use only what's provided or scraped.
- No border-radius anywhere. Hard corners only.
- No fixed pixel-width layouts that break below 360px.

## TONE

Plain English. Short sentences. Concrete nouns. Write like a tradesperson who's been on the tools for 20 years would say it — not like a marketing agency deck. Copy should make the reader think "that's me" in the first 3 seconds.`;

export interface MockupReview {
  author: string;
  rating: number | null;
  text: string;
  relativeTime: string | null;
}

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
  /** Logo URL for the top bar. Absolute http(s) only. */
  logoUrl?: string | null;
  /** Dominant brand colours sampled from the logo. First entry is the
   *  primary accent, second is secondary. Empty array falls back to
   *  #ff3d00 accent. */
  brandColors?: string[];
  /** Up to 6 absolute URLs of content images to hotlink in the mockup. */
  images?: string[];
  /** Up to 5 Google reviews for the testimonial section. Empty skips the
   *  section entirely. */
  googleReviews?: MockupReview[];
  /** Aggregate Google rating for aggregateRating JSON-LD + trust row. */
  googleRating?: number | null;
  googleReviewCount?: number | null;
  /** Prospect phone / address / postcode pulled from Places if available. */
  phone?: string | null;
  address?: string | null;
  postcode?: string | null;
}

export interface MockupResult {
  html: string;
  headline: string | null;
}

const HEADLINE_RE = /<h1[^>]*>([\s\S]*?)<\/h1>/i;

function extractHeadline(html: string): string | null {
  const m = HEADLINE_RE.exec(html);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 140) || null;
}

function formatReviews(reviews: MockupReview[] | undefined): string {
  if (!reviews || reviews.length === 0) return '(none — omit the testimonial section entirely)';
  return reviews
    .slice(0, 5)
    .map((r, i) => {
      const stars = r.rating !== null ? `${r.rating}/5` : '?/5';
      const when = r.relativeTime ? ` · ${r.relativeTime}` : '';
      return `${i + 1}. ${r.author} (${stars}${when}): ${r.text.replace(/\s+/g, ' ').slice(0, 600)}`;
    })
    .join('\n');
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

  const brandColorsLine =
    input.brandColors && input.brandColors.length > 0
      ? input.brandColors.join(', ')
      : '(none — fall back to #ff3d00 accent)';

  const logoLine = input.logoUrl
    ? `Logo URL (use in sticky top bar, max-height ~40px): ${input.logoUrl}`
    : 'Logo URL: (none — use business name as wordmark)';

  const imagesLine =
    input.images && input.images.length > 0
      ? input.images.map((u, i) => `${i + 1}. ${u}`).join('\n')
      : '(no images — keep the design text-driven and use CSS blocks where an image would go)';

  const googleLine = (() => {
    const parts: string[] = [];
    if (input.googleRating !== null && input.googleRating !== undefined) {
      parts.push(`Rating: ${input.googleRating}/5`);
    }
    if (input.googleReviewCount !== null && input.googleReviewCount !== undefined) {
      parts.push(`Review count: ${input.googleReviewCount}`);
    }
    return parts.length > 0 ? parts.join(' · ') : '(no Google rating)';
  })();

  const todayIso = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getUTCFullYear();
  const userPrompt = `Build the mockup for this prospect.

TODAY'S DATE: ${todayIso} (current year is ${currentYear}). Use this for copyright lines, "established 20XX" dates, and any relative time references. Do NOT use a year earlier than ${currentYear}.

Prospect URL: ${input.url}
Business name: ${input.businessName ?? '(unknown — infer from site content)'}
Phone: ${input.phone ?? '(unknown — pull from scraped content)'}
Address: ${input.address ?? '(unknown — pull from scraped content)'}
Postcode / area: ${input.postcode ?? '(unknown)'}

${logoLine}

Brand colours (first = primary accent, second = secondary):
${brandColorsLine}

Images (USE these exact URLs, DO NOT invent others):
${imagesLine}

Google presence:
${googleLine}

Google reviews (real, use verbatim, keep short quotes):
${formatReviews(input.googleReviews)}

SEO extract:
${seoLines}

Top audit findings (for context, so your mockup visibly solves these):
${issuesBrief || '(no findings — design a strong generic improvement)'}

Scraped site copy (sanitised):
${stripped}

Now produce the complete HTML document per the system rules. Remember:
light mode only, real images from the list above, real Google reviews if
given, LocalBusiness JSON-LD with aggregateRating if provided, FAQPage
JSON-LD if you wrote 3+ FAQs, speakable class on hero + FAQ answers,
absolutely no em-dashes. Return HTML only.`;

  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 12_000,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    },
    { signal: AbortSignal.timeout(240_000) },
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
  };
}
