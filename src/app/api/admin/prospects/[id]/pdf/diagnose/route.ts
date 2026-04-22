import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { renderAuditPdf, type PdfBisectFlags } from '@/lib/pdf';
import { fetchAsNormalisedJpeg } from '@/lib/fetch-image';
import { startBreadcrumbTrail, memorySnapshot } from '@/lib/pdf-breadcrumb';
import type { OutreachIssue } from '@/lib/outreach';

/**
 * Diagnostic PDF render. Same prospect, same render code, but:
 *   - no Vercel Blob write
 *   - no cache hit
 *   - dense breadcrumbs written to pdf_render_breadcrumbs at every step
 *   - optional bisection flags via query params:
 *       ?skip=images   -> render without any screenshots
 *       ?skip=desktop  -> drop desktop shot
 *       ?skip=mobile   -> drop mobile shot
 *       ?skip=issues   -> render with a single stub issue (no findings loop)
 *
 * Returns JSON with request_id, breadcrumb table name, bytes (or error).
 * Query the table with:
 *   SELECT step, ok, elapsed_ms, meta
 *   FROM pdf_render_breadcrumbs
 *   WHERE request_id = '<uuid>'
 *   ORDER BY ts;
 *
 * Last-surviving row identifies the crash point when react-pdf SIGKILLs.
 *
 * Admin auth is enforced by src/middleware.ts Basic Auth gate.
 *
 * Safe to call repeatedly. Delete this route once the crash is fixed.
 */
export const maxDuration = 300;

/**
 * Accepted `?skip=` values (comma-separated, any combination):
 *   Asset-level:  desktop | mobile | images
 *   Document-level (via bisect flags passed to <AuditDocument>):
 *     statstrip | healthstrip | lossheadline | findings | opportunities
 *     | trustpage | portfolio | cta | shots | all
 *   Content-level: issues   (replaces issues array with a single stub)
 *
 * Example: ?skip=statstrip,lossheadline,trustpage,portfolio,cta
 */
function parseSkipSet(raw: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.toLowerCase().split(',').map((s) => s.trim()).filter(Boolean));
}

function skipToBisect(skips: Set<string>): PdfBisectFlags {
  const all = skips.has('all');
  return {
    skipStatStrip:    all || skips.has('statstrip'),
    skipHealthStrip:  all || skips.has('healthstrip'),
    skipLossHeadline: all || skips.has('lossheadline'),
    skipFindings:     all || skips.has('findings'),
    skipOpportunities: all || skips.has('opportunities'),
    skipTrustPage:    all || skips.has('trustpage'),
    skipPortfolio:    all || skips.has('portfolio'),
    skipCta:          all || skips.has('cta'),
    skipShots:        all || skips.has('shots'),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const rawSkip = url.searchParams.get('skip');
  const skips = parseSkipSet(rawSkip);
  const bisect = skipToBisect(skips);
  const skipDesktop: boolean = skips.has('desktop') || skips.has('images');
  const skipMobile:  boolean = skips.has('mobile')  || skips.has('images');
  const stubIssues = skips.has('issues');
  const rawTake = url.searchParams.get('take');
  const take = rawTake ? Math.max(0, Math.min(50, Number.parseInt(rawTake, 10) || 0)) : null;
  const rawOnly = url.searchParams.get('only');
  const only = rawOnly ? Math.max(1, Math.min(50, Number.parseInt(rawOnly, 10) || 0)) : null;
  const trail = startBreadcrumbTrail(id);
  await trail.log('diagnose:enter', {
    route: '/api/admin/prospects/[id]/pdf/diagnose',
    skip: rawSkip,
    bisect,
    asset_skip: { desktop: skipDesktop, mobile: skipMobile },
    stub_issues: stubIssues,
    take,
    only,
  });

  const rows = (await sql`
    SELECT url, business_name, audit_score, audit_summary, audit_data,
           screenshot_desktop_url, screenshot_mobile_url, mockup_screenshot_url,
           broken_links_count, viewport_meta_ok, copyright_year,
           place_data
    FROM prospects WHERE id = ${id} LIMIT 1
  `) as Array<{
    url: string;
    business_name: string | null;
    audit_score: number | null;
    audit_summary: string | null;
    audit_data: { issues?: OutreachIssue[]; opportunities?: Array<{ category: string; title: string; detail: string; fix: string }> } | null;
    screenshot_desktop_url: string | null;
    screenshot_mobile_url: string | null;
    mockup_screenshot_url: string | null;
    broken_links_count: number | null;
    viewport_meta_ok: boolean | null;
    copyright_year: number | null;
    place_data: { types?: string[]; primaryType?: string } | null;
  }>;

  if (rows.length === 0) {
    await trail.fail('diagnose:prospect_not_found', new Error('no row'));
    return NextResponse.json({ ok: false, request_id: trail.requestId, error: 'not_found' }, { status: 404 });
  }
  const p = rows[0];
  await trail.log('diagnose:prospect_loaded', {
    url: p.url,
    has_audit_data: Boolean(p.audit_data?.issues?.length),
    issues_count: p.audit_data?.issues?.length ?? 0,
    opportunities_count: p.audit_data?.opportunities?.length ?? 0,
    has_desktop_shot: Boolean(p.screenshot_desktop_url),
    has_mobile_shot: Boolean(p.screenshot_mobile_url),
    has_mockup_shot: Boolean(p.mockup_screenshot_url),
  });

  if (!p.audit_data?.issues?.length) {
    await trail.fail('diagnose:audit_not_ready', new Error('no issues'));
    return NextResponse.json({ ok: false, request_id: trail.requestId, error: 'audit_not_ready' }, { status: 409 });
  }

  try {
    await trail.log('assets:fetch_start', { skip: rawSkip });

    const fetchDesktop = (skipDesktop || !p.screenshot_desktop_url)
      ? Promise.resolve(null)
      : fetchAsNormalisedJpeg(p.screenshot_desktop_url, { maxWidth: 900 }).catch(() => null);
    const fetchMobile = (skipMobile || !p.screenshot_mobile_url)
      ? Promise.resolve(null)
      : fetchAsNormalisedJpeg(p.screenshot_mobile_url, { maxWidth: 400 }).catch(() => null);

    const [desktopShot, mobileShot] = await Promise.all([fetchDesktop, fetchMobile]);

    await trail.log('assets:images_resolved', {
      desktop_bytes: desktopShot?.data.byteLength ?? null,
      mobile_bytes: mobileShot?.data.byteLength ?? null,
      desktop_first4: desktopShot ? Buffer.from(desktopShot.data).subarray(0, 4).toString('hex') : null,
      mobile_first4: mobileShot ? Buffer.from(mobileShot.data).subarray(0, 4).toString('hex') : null,
    });

    const toDataUri = (b: { data: Buffer; format: 'jpg' } | null): string | null =>
      b ? `data:image/jpeg;base64,${b.data.toString('base64')}` : null;
    const desktopBuf = toDataUri(desktopShot);
    const mobileBuf = toDataUri(mobileShot);

    const rawIssues = p.audit_data?.issues ?? [];
    let issues: typeof rawIssues;
    if (stubIssues) {
      issues = [{ severity: 'medium', category: 'Test', title: 'stub', detail: 'stub.', fix: 'stub.' }];
    } else if (only !== null) {
      const pick = rawIssues[only - 1];
      issues = pick ? [pick] : [];
    } else if (take !== null) {
      issues = rawIssues.slice(0, take);
    } else {
      issues = rawIssues;
    }

    const basePdfArgs = {
      url: p.url,
      businessName: p.business_name,
      score: p.audit_score ?? 0,
      summary: p.audit_summary ?? '',
      issues,
      opportunities: p.audit_data?.opportunities ?? [],
      date: new Date().toISOString().slice(0, 10),
      brokenLinksCount: p.broken_links_count,
      viewportMetaOk: p.viewport_meta_ok,
      copyrightYear: p.copyright_year,
      placeTypes: p.place_data?.types ?? (p.place_data?.primaryType ? [p.place_data.primaryType] : null),
      mockupScreenshot: null,
      screenshotDesktop: desktopBuf,
      screenshotMobile: mobileBuf,
      bisect,
    };

    await trail.log('doc:args_built', {
      desk_uri_len: desktopBuf?.length ?? null,
      mob_uri_len: mobileBuf?.length ?? null,
      issues: basePdfArgs.issues.length,
      opportunities: basePdfArgs.opportunities.length,
      bisect,
    });

    await trail.log('render:about_to_call_renderToBuffer', {
      memory: memorySnapshot(),
      has_desktop: Boolean(desktopBuf),
      has_mobile: Boolean(mobileBuf),
      bisect,
    });

    const bytes = await renderAuditPdf(basePdfArgs);

    await trail.log('render:returned', {
      bytes: bytes.byteLength,
      memory: memorySnapshot(),
    });

    return NextResponse.json({
      ok: true,
      request_id: trail.requestId,
      bytes: bytes.byteLength,
      skip: rawSkip,
      bisect,
      take,
      only,
      issues_rendered: issues.length,
      hint: `SELECT step, ok, elapsed_ms, meta FROM pdf_render_breadcrumbs WHERE request_id = '${trail.requestId}' ORDER BY ts;`,
    });
  } catch (err) {
    await trail.fail('diagnose:render_threw', err, { memory: memorySnapshot() });
    return NextResponse.json({
      ok: false,
      request_id: trail.requestId,
      error: err instanceof Error ? err.message : String(err),
      error_stack_first_line: err instanceof Error && err.stack ? err.stack.split('\n')[1]?.trim() : null,
      hint: `SELECT step, ok, elapsed_ms, meta FROM pdf_render_breadcrumbs WHERE request_id = '${trail.requestId}' ORDER BY ts;`,
    }, { status: 500 });
  }
}
