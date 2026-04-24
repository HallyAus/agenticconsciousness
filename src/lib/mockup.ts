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

// Sonnet 4.6 is the right call here: 3x faster than Opus on long HTML
// generation (~50s vs ~150s for our 16k-token mockups), capable enough
// for the structured HTML+JSON-LD output, and fits comfortably inside
// Vercel's 300s function budget alongside the 60-90s audit step.
// Opus was timing out before the after() background hook could complete.
// Override with AI_MOCKUP_MODEL=claude-opus-4-7 if you want richer copy.
const MODEL = process.env.AI_MOCKUP_MODEL || 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are a senior web designer + conversion copywriter building a "here is what your new site could look like" mockup for a cold-outreach prospect. You compose COMPLETE, self-contained, production-quality HTML that is simultaneously tight on conversion, strong on brand, and heavily optimised for both traditional SEO and AI-answer-engine (AEO) surfaces.

## OUTPUT FORMAT

Output a single COMPLETE HTML document. Start with <!DOCTYPE html>, end with </html>. Inline all CSS in <style>. ONE script tag is allowed, only for JSON-LD. No external fonts, no external JS libraries. External images ARE allowed and expected (the caller provides a vetted list of hotlink URLs — USE them exactly as given).

Return ONLY the HTML. No markdown fences, no commentary, no explanation.

## COLOUR — LIGHT-DOMINANT, BRAND-LED, NEVER GENERIC

Every mockup must feel visually DISTINCT to its prospect. The default
white-with-red-accent template was producing identical-looking output
across every prospect. Use the prospect's actual brand colours
aggressively, not just as a tiny CTA accent.

### Where colours go

- **Page background:** #ffffff (white). Dominant surface.
- **Section alternating background:** rotate between #ffffff, #f6f4f2 (warm neutral), AND a **tinted variant of the brand primary** (e.g. brand colour at ~6% opacity over white, or a 95% lightness version). At least ONE non-hero section should carry a brand-tinted background to break the visual monotony.
- **Hero treatment:** strong brand-colour usage. Pick one of these hero patterns and commit fully:
  - (a) White hero, GIANT brand-colour H1, brand-colour underline rules, brand-colour CTA
  - (b) Brand-colour KICKER strip across the very top (full-bleed thin band, white text), then white hero below
  - (c) Split hero: left half brand-colour solid block with H1 reversed in white, right half white with image
  - (d) White hero with a brand-colour DIAGONAL geometric block behind the H1
  Pick whichever fits the trade and the brand colour intensity. Never the default "white-with-red-CTA" template.
- **CTAs:** brand primary as button background, white text. Secondary CTA can be outline in brand primary.
- **Headings + accents:** H2 underlines, kicker lines, decorative rules — all in brand primary.
- **Section dividers:** thick brand-coloured horizontal rules (4-8px) between major zones, not thin grey lines.
- **Body text:** #0a0a0a on white sections, #1a1a1a on tinted sections.
- **Stat strip numbers:** brand primary in giant size.

### Hard constraints (still apply)

- Page body background MUST stay light (white or tinted-white). NEVER #000/#0a0a0a/#111/#222 etc.
- ONE section MAY use a strong brand-colour solid background with reversed white text — but only ONE per page (typically the hero band, the "Why Us" block, or the bottom CTA strip). Use this sparingly for punch, not as a default.
- No fancy soft drop-shadows or blurry glows. Hard geometric blocks only.
- No rounded corners (border-radius: 0 everywhere, including inputs and CTAs).

### Brand colour selection logic

The caller provides up to 3 brand colours sampled from the logo + homepage CSS, ordered by importance.

- If TWO OR MORE brand colours are provided: use the first as primary (CTAs, hero accents, dividers), the second as secondary (alternating section backgrounds at low opacity, decorative blocks). Build the page palette around BOTH.
- If ONE brand colour: use it everywhere as primary. Add a complementary neutral (#1a1a1a or #f6f4f2) for variation.
- If ZERO brand colours: instead of falling back to #ff3d00 every time, pick a trade-appropriate default:
  - Electrician → #f4b400 (signal yellow)
  - Plumber → #1976d2 (utility blue)
  - Roofer → #5d4037 (terracotta brown)
  - Painter → #6a1b9a (bold purple) or pull from any colour mentioned in their portfolio copy
  - Landscaper → #2e7d32 (deep green)
  - Cleaner → #00897b (teal)
  - Mechanic → #c62828 (red)
  - Carpenter → #6d4c41 (warm brown)
  - Cafe / restaurant → #6d4c41 (espresso)
  - Hairdresser / beauty → #ad1457 (deep magenta)
  - Florist → #d81b60 (vibrant pink)
  - Real estate / lawyer / accountant → #1a237e (navy)
  - Default if trade unknown: #ff3d00

Sanity check before output: search your own HTML for "background:#0", "background-color:#0", or any hex starting with #00/#01/#02/#03 on a body/section/container. If any match, change it.

## TYPOGRAPHY

System stack: 'Helvetica Neue', Arial, sans-serif. For monospace kickers: ui-monospace, 'Courier New', monospace. Heavy weights (800-900) for display. Tight letter-spacing on display text (-0.5 to -1px). Body text 16-17px, line-height 1.5-1.65.

## LAYOUT

Mobile-first. CSS grid + flexbox only. No tables for layout. No Bootstrap. No frameworks. Max content width around 1200px. Generous vertical rhythm (min 80px between major sections on desktop, 56px mobile).

## REQUIRED SECTIONS (IN THIS ORDER)

Every mockup MUST include these in this order. Skip only the ones explicitly flagged below.

1. **Sticky top bar** — logo left (use the provided logo URL if given; otherwise business-name wordmark), phone link + a single "BOOK" CTA on the right. Stays fixed on scroll.

2. **Hero** — MUST be above the fold. THREE-PART headline: a tiny mono kicker line above (e.g. "ELECTRICIANS · CENTRAL COAST"), then the giant specific H1 (max 10 words, tells the visitor exactly what you do + who you serve + the local area), then ONE sub-line of value prop. Optionally include a 3-5 word PERSONALITY TAGLINE under the value prop in italic (e.g. "Sparks fly when we visit." or "Your lawn, our problem."). TWO distinct CTAs side-by-side: "CALL NOW" (tel:) and "BOOK ONLINE" (the booking link). Include a real hero image from the provided image list, placed to the right on desktop or below the copy on mobile.

3. **Stat strip** — directly under the hero, FOUR equal-width stat cards. Each card: a giant number (years/jobs/rating/coverage) and a one-line label below. Examples: "7+ YEARS LOCAL", "500+ JOBS DONE", "5.0 GOOGLE RATING", "INSURED + LICENSED". Pull real numbers from the scraped copy + Google rating + review count. NEVER fabricate stats — if you cannot find a real number for a slot, replace it with a binary credential ("FULLY INSURED", "FAMILY OWNED", "SAME-DAY QUOTES"). This is a high-CRO trust row — do not skip and do not water down.

4. **Services** — 3-6 cards in a grid. Each card: an OUTCOME-LED title (H3) — describe what the customer GETS, not what you do (e.g. "Crisp Clean Edges Every Time" not "Edging Service"; "Switchboards That Actually Pass Inspection" not "Switchboard Upgrades"). 2-3 sentence description using REAL TRADE VOCABULARY (see TRADE VOCABULARY section below). Each description ends with a short benefit line in the brand accent colour. Add a small visual per card (real image from the list if available, otherwise the brutalist CSS placeholder block specified in the IMAGES section).

5. **Who we serve** — exactly THIS section, do not skip. Four scenario cards in a grid that segment the buyer journey. Each card: a short scenario title + 2-line description matching the trade. Examples for a tradie:
   - "Homeowners maintaining their property"
   - "Real estate agents and property managers"
   - "End-of-lease tenants chasing bond"
   - "Strata + commercial one-off jobs"
   Adapt the four scenarios to whatever the trade actually serves. This is a high-conversion pattern — visitors self-identify which card describes them, then the next CTA hits.

6. **Social proof section** — if Google reviews are provided, use them as a testimonial grid (2-3 visible, each with author, star rating, text, "— from Google"). If no Google reviews, pull the most credible testimonial from their site. If neither, OMIT this section entirely — never fabricate.

7. **Founder / About** — short personal narrative in first-person. Tone: humble, hands-on, local. Two short paragraphs (3-4 sentences each). Pulls from any "About us" or founder mentions in the scraped copy. If no founder name found, use a generic but grounded line ("We're a family-owned [trade] business based in [area], on the tools since [year]"). Add 3-4 short bullet benefits below the bio (e.g. "Same-day quotes", "All work guaranteed in writing", "No call-out fee for existing customers", "Trained apprentices on every job"). Then ONE primary CTA below the bullets.

8. **Service area / Coverage** — list the suburbs or region they serve. Use real text from their site. Mention the specific local area at least 3 times across the page in total.

9. **FAQ** — 3-5 real Q&A pairs relevant to the business. Infer from their site content, common customer objections, and the business category. Each Q is a <h3>, each A is a <p>. Use REAL TRADE VOCABULARY in the answers. This section drives AEO (Google AI Overviews + ChatGPT cite FAQ schemas heavily) — make it substantive, not filler.

10. **Contact form** — full-width contact form with: Name, Phone, Email, Suburb, Service-needed dropdown (populate options from the actual services above), short message textarea, big "GET MY FREE QUOTE" submit. Form action="#" — non-functional in the mockup but present.

11. **Bottom CTA strip** — final dual-button strip ("CALL NOW" + "BOOK ONLINE") with a single value-prop sentence above. Last conversion shot before the footer.

12. **Footer** — copyright current year, ABN if known. Logo, contact info repeated, service links, quick nav, trust markers (insured/licensed badges if real). Micro nav with Privacy, Terms links.

## VARIATION — NEVER PRODUCE THE SAME LAYOUT TWICE

Two prospects of the same trade should still produce visibly different
mockups. Pick ONE option per axis below based on the prospect's brand,
trade, and content density. Do not always pick the first option.

- **Hero pattern:** rotate between (a) white-with-giant-coloured-H1, (b) brand-colour kicker strip + white hero, (c) split brand-block-left + image-right, (d) white hero with diagonal brand block
- **Services layout:** rotate between (a) 3-col grid with images, (b) 2-col grid with bigger cards, (c) alternating left-right blocks (image left, copy right; then reversed), (d) horizontal scroll-snap row
- **Stat strip layout:** rotate between (a) 4-col equal cards, (b) 2x2 grid with bigger numbers, (c) horizontal text-only line (e.g. "7+ YEARS · 500+ JOBS · 5.0 ON GOOGLE · INSURED")
- **Who-we-serve layout:** rotate between (a) 4 equal cards, (b) 2x2 with bigger blocks, (c) horizontal numbered list with bold dividers
- **FAQ layout:** rotate between (a) accordion (details/summary), (b) Q-on-left/A-on-right two-column, (c) flat list with bold Q + indented A

The trade-specific copy AND a different layout combo per prospect together prevent the "every mockup looks the same" problem.

## TRADE VOCABULARY — NON-NEGOTIABLE

Generic copy ("we provide quality service") is the #1 reason mockups read as generic. Use REAL trade jargon throughout — terminology that signals expertise to a customer who already knows the problem space. Examples per trade (use whichever applies, infer others from the scraped site):

- **Electrician**: switchboard, RCD, sub-board, three-phase, light-and-power, EV charger install, ceiling fan, smoke alarm compliance, data cabling, fault-finding, after-hours call-out
- **Plumber**: hot water unit, blocked drains, gas fitting, leaking tap, hydrojet, CCTV drain camera, backflow prevention, sewer/stormwater, hot-water timer
- **Lawn / landscaper**: mulching, catching, edging, hedging, double-pass, fortnightly visits, slashing, bindii / clover / winter grass control, green waste, irrigation
- **Painter**: prep + sand, undercoat, two-top-coats, weatherboard, render, ceiling roller, cut-in, drop sheets
- **Roofer**: ridge cap, valley iron, flashing, gutter clean, leaf guard, Colorbond, terracotta, sarking, downpipe replacement
- **Carpenter**: stud frame, MDF, dressed pine, mitre, dado, scribed-in, shadowline, architrave

Pick the right vocabulary for THIS trade. If you can't infer the trade from the scraped content, prefer concrete physical nouns over abstract ("we install power points and ceiling fans" beats "we offer comprehensive electrical solutions").

## CTAs

Every CTA button: dominant-accent background, white text, uppercase, letter-spacing 2px, NO border-radius. Buttons on light backgrounds get a solid fill; never outline-only. CTAs MUST appear at least SIX TIMES across the page. Required positions: (1) sticky top bar, (2) hero, (3) under stat strip or services, (4) under "Who we serve", (5) under About / Founder, (6) bottom strip. Alternate between phone-link and book/form CTAs so the visitor always has the next-best action one click away.

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
  /** Trade hint for default colour palette + vocabulary. e.g. "electrician",
   *  "plumber", "landscaper". Falls back to keyword inference if null. */
  tradeHint?: string | null;
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
Trade / category: ${input.tradeHint ?? '(unknown — infer from site content; pick trade-default colour palette accordingly)'}
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
      // Bumped 12000 -> 16000 after adding new required sections
      // (stat strip, who-we-serve, founder, contact form, bottom CTA strip
      // + trade-vocabulary copy density). Older limit was clipping the
      // generated HTML mid-section on richer mockups.
      max_tokens: 16_000,
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
