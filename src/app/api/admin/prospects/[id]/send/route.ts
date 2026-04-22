import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf } from '@/lib/pdf';
import { createDraftAuto } from '@/lib/graph-auto';
import { isGraphConfigured } from '@/lib/graph';
import { isDelegatedConnected } from '@/lib/graph-delegated';
import { buildTouch1, type OutreachIssue } from '@/lib/outreach';
import { injectPixel, newTrackingToken, rewriteLinks } from '@/lib/email-tracking';
import { isSuppressed } from '@/lib/suppression';
import { pickRandomActiveVariant, renderSubject } from '@/lib/subject-variants';
import { isBlockingVerdict, validateEmail } from '@/lib/email-validate';
import { fetchAsNormalisedJpeg } from '@/lib/fetch-image';

// Allow up to 60s for send: audit is already done, but two ScreenshotOne
// prefetches + PDF render + Graph draft creation can add up when
// ScreenshotOne is rendering a cold URL.
export const maxDuration = 60;

/**
 * Admin-only: create a DRAFT email in the sender's mailbox with the audit
 * PDF attached. Returns a `webLink` that deep-links to the draft in Outlook
 * on the web so Daniel can review and send manually.
 *
 * Status flow:
 *   'audited' -> 'drafted' (this endpoint)
 *   'drafted' -> 'sent'    (mark-sent endpoint, manual)
 */

interface ProspectRow {
  id: string;
  url: string;
  business_name: string | null;
  email: string | null;
  status: string;
  audit_score: number | null;
  audit_summary: string | null;
  audit_data: { issues?: OutreachIssue[] } | null;
  unsub_token: string | null;
  draft_web_link: string | null;
  screenshot_desktop_url: string | null;
  screenshot_mobile_url: string | null;
  broken_links_count: number | null;
  viewport_meta_ok: boolean | null;
  copyright_year: number | null;
  mockup_token: string | null;
  mockup_screenshot_url: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const overrides = await req.json().catch(() => ({})) as {
    subjectOverride?: string;
    htmlOverride?: string;
  };

  const hasDelegated = await isDelegatedConnected();
  if (!isGraphConfigured() && !hasDelegated) {
    return NextResponse.json(
      { error: 'Microsoft 365 not connected. Click "Connect Microsoft 365" in /admin.' },
      { status: 503 },
    );
  }

  const rows = (await sql`
    SELECT id, url, business_name, email, status, audit_score, audit_summary, audit_data, unsub_token, draft_web_link,
           screenshot_desktop_url, screenshot_mobile_url, broken_links_count, viewport_meta_ok, copyright_year,
           mockup_token, mockup_screenshot_url
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as ProspectRow[];
  if (rows.length === 0) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const p = rows[0];

  if (!p.email) return NextResponse.json({ error: 'No email on file' }, { status: 400 });
  if (p.status === 'unsubscribed') return NextResponse.json({ error: 'Prospect has unsubscribed' }, { status: 409 });
  if (await isSuppressed(p.email)) {
    await sql`UPDATE prospects SET status = 'unsubscribed', updated_at = NOW() WHERE id = ${id}`;
    return NextResponse.json({ error: `${p.email} is on the global suppression list.` }, { status: 409 });
  }

  // Pre-flight email validation (skipped if ABSTRACT_API_KEY not set).
  // Block only on clearly undeliverable; let 'risky' through so we don't
  // over-filter role addresses + catch-alls.
  const validation = await validateEmail(p.email);
  if (isBlockingVerdict(validation.verdict)) {
    await sql`
      UPDATE prospects SET status = 'bounced', updated_at = NOW() WHERE id = ${id}
    `;
    return NextResponse.json({
      error: `Email address is undeliverable (${validation.verdict}). Flipped to 'bounced'.`,
      validation,
    }, { status: 409 });
  }
  if (p.status !== 'audited' && p.status !== 'drafted') {
    return NextResponse.json({ error: `Cannot draft from status ${p.status}` }, { status: 409 });
  }
  if (!p.audit_data?.issues?.length) return NextResponse.json({ error: 'Audit has no issues' }, { status: 400 });
  if (!p.unsub_token) return NextResponse.json({ error: 'Missing unsub token' }, { status: 500 });

  const siteBaseUrl = process.env.SITE_URL || 'https://agenticconsciousness.com.au';
  const domain = new URL(p.url).hostname.replace(/^www\./, '');

  const ctx = {
    url: p.url,
    domain,
    businessName: p.business_name,
    score: p.audit_score ?? 0,
    summary: p.audit_summary ?? '',
    issues: p.audit_data.issues,
    unsubToken: p.unsub_token,
    sourceLine: `You're receiving this because ${p.email} is publicly listed on ${domain}. This is a one-off audit, not a mailing list.`,
    siteBaseUrl,
    mockupToken: p.mockup_token,
    mockupScreenshotUrl: p.mockup_screenshot_url,
  };

  // Subject: prefer admin override, else A/B variant, else template default.
  const variant = overrides.subjectOverride ? null : await pickRandomActiveVariant();
  const built = buildTouch1(ctx);
  const subject = overrides.subjectOverride?.trim()
    || (variant ? renderSubject(variant.template, { domain, businessName: p.business_name }) : built.subject);
  const html = overrides.htmlOverride?.trim() || built.html;

  // Prefetch screenshots as canonical `{ data, format: 'jpg' }` buffers.
  // sharp normalises to baseline JPEG with EXIF + ICC stripped, which is
  // what @react-pdf/renderer v4 expects server-side — data URIs trigger
  // jpeg-exif "Unknown version" crashes on some real-world payloads.
  // If prefetch + PDF render fails, retry without so the Draft still
  // lands (just without the site screenshots).
  const [desktopShot, mobileShot] = await Promise.all([
    p.screenshot_desktop_url ? fetchAsNormalisedJpeg(p.screenshot_desktop_url, { maxWidth: 900 }).catch(() => null) : Promise.resolve(null),
    p.screenshot_mobile_url ? fetchAsNormalisedJpeg(p.screenshot_mobile_url, { maxWidth: 400 }).catch(() => null) : Promise.resolve(null),
  ]);

  const basePdfArgs = {
    url: p.url,
    businessName: p.business_name,
    score: p.audit_score ?? 0,
    summary: p.audit_summary ?? '',
    issues: p.audit_data.issues,
    date: new Date().toISOString().slice(0, 10),
    brokenLinksCount: p.broken_links_count,
    viewportMetaOk: p.viewport_meta_ok,
    copyrightYear: p.copyright_year,
  };

  // Raw Buffer instead of the { data, format } wrapper — the object form
  // silently skips embedding on Vercel (Issue #2639 class). Raw Buffer
  // with format guessed from SOI bytes embeds reliably on both local and
  // serverless runtimes.
  const desktopBuf = desktopShot?.data ?? null;
  const mobileBuf = mobileShot?.data ?? null;

  console.log('[send] pdf start', {
    id,
    desk_url_present: !!p.screenshot_desktop_url,
    mob_url_present: !!p.screenshot_mobile_url,
    desk_buf_bytes: desktopBuf?.byteLength ?? null,
    mob_buf_bytes: mobileBuf?.byteLength ?? null,
  });

  let pdfBuffer: Buffer;
  let renderPath: 'with-shots' | 'fallback' = 'with-shots';
  try {
    pdfBuffer = await renderAuditPdf({
      ...basePdfArgs,
      screenshotDesktop: desktopBuf,
      screenshotMobile: mobileBuf,
    });
  } catch (err) {
    renderPath = 'fallback';
    console.error('[send] PRIMARY render with screenshots FAILED:', err instanceof Error ? err.stack ?? err.message : err);
    pdfBuffer = await renderAuditPdf({
      ...basePdfArgs,
      screenshotDesktop: null,
      screenshotMobile: null,
    });
  }
  console.log('[send] pdf done', { id, renderPath, pdf_bytes: pdfBuffer.byteLength });

  // Wire tracking: stamp a token, rewrite links through tracker, inject pixel.
  const trackingToken = newTrackingToken();
  const trackedHtml = injectPixel(
    rewriteLinks(html, siteBaseUrl, trackingToken),
    siteBaseUrl,
    trackingToken,
  );

  try {
    const draft = await createDraftAuto({
      to: p.email,
      subject,
      html: trackedHtml,
      pdf: { filename: `audit-${domain}.pdf`, base64: pdfBuffer.toString('base64') },
    });

    // Create the prospect_sends row NOW (not on mark-sent) so tracking
    // pixels + clicks attribute correctly the moment the draft exists.
    // The send is created with sent_at = NOW() for ordering, but
    // touch_count on prospects stays at 0 until the human clicks
    // "Mark as sent".
    await sql`
      INSERT INTO prospect_sends (
        prospect_id, touch_num, subject, body_snapshot,
        graph_message_id, graph_conversation_id, tracking_token,
        subject_variant_id, subject_variant_label
      )
      VALUES (
        ${id}, 1, ${subject}, ${trackedHtml},
        ${draft.messageId}, ${draft.conversationId}, ${trackingToken},
        ${variant?.id ?? null}, ${variant?.label ?? null}
      )
    `;

    await sql`
      UPDATE prospects
      SET status = 'drafted',
          graph_message_id = ${draft.messageId},
          graph_conversation_id = ${draft.conversationId},
          draft_web_link = ${draft.webLink},
          draft_created_at = NOW(),
          drafted_subject = ${subject},
          drafted_body_html = ${trackedHtml},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({
      ok: true,
      mode: draft.mode,
      messageId: draft.messageId,
      conversationId: draft.conversationId,
      webLink: draft.webLink,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'draft failed';
    console.error('[admin/draft] failed', { id, msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
