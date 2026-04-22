import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { sql } from '@/lib/pg';
import { runStructuredAudit, normaliseUrl } from '@/lib/audit-core';
import { extractEmailFromHtml } from '@/lib/email-scrape';
import type { PlaceResult } from '@/lib/places';

/**
 * Admin-only. Convert a Google Place into a prospect row and kick off the
 * audit pipeline. Dedups on source_place_id — if already added, returns
 * the existing prospect.
 */

interface AddBody {
  place: PlaceResult;
  postcode?: string;
}

export async function POST(req: NextRequest) {
  let body: AddBody;
  try {
    body = (await req.json()) as AddBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const place = body.place;
  if (!place?.id) return NextResponse.json({ error: 'place.id required' }, { status: 400 });

  const existing = (await sql`
    SELECT id FROM prospects WHERE source_place_id = ${place.id} LIMIT 1
  `) as Array<{ id: string }>;
  if (existing.length > 0) {
    return NextResponse.json({ id: existing[0].id, alreadyExists: true });
  }

  const websiteUri = place.websiteUri?.trim() || '';
  const normalisedUrl = websiteUri ? normaliseUrl(websiteUri) : null;

  // If no website, still record the prospect (status 'new') so Daniel
  // can add a URL later or chase them on the phone. No audit to run.
  if (!normalisedUrl) {
    const inserted = (await sql`
      INSERT INTO prospects (
        url, business_name, phone, address, postcode,
        discovered_via, source_place_id, place_data, status
      )
      VALUES (
        ${'https://placeholder.invalid/' + place.id}, ${place.displayName}, ${place.phone},
        ${place.formattedAddress}, ${body.postcode ?? null},
        'google_places', ${place.id}, ${JSON.stringify(place)}::jsonb, 'new'
      )
      RETURNING id
    `) as Array<{ id: string }>;
    return NextResponse.json({ id: inserted[0].id, noWebsite: true });
  }

  const canonical = normalisedUrl.toString();

  // Dedup on URL too — someone may have been added manually earlier.
  const byUrl = (await sql`
    SELECT id FROM prospects WHERE lower(url) = lower(${canonical}) LIMIT 1
  `) as Array<{ id: string }>;
  if (byUrl.length > 0) {
    await sql`
      UPDATE prospects
      SET source_place_id = COALESCE(source_place_id, ${place.id}),
          discovered_via = CASE WHEN discovered_via = 'manual' THEN 'google_places' ELSE discovered_via END,
          phone = COALESCE(phone, ${place.phone}),
          address = COALESCE(address, ${place.formattedAddress}),
          postcode = COALESCE(postcode, ${body.postcode ?? null}),
          place_data = COALESCE(place_data, ${JSON.stringify(place)}::jsonb),
          updated_at = NOW()
      WHERE id = ${byUrl[0].id}
    `;
    return NextResponse.json({ id: byUrl[0].id, mergedWithExistingUrl: true });
  }

  const inserted = (await sql`
    INSERT INTO prospects (
      url, business_name, phone, address, postcode,
      discovered_via, source_place_id, place_data, status
    )
    VALUES (
      ${canonical}, ${place.displayName}, ${place.phone},
      ${place.formattedAddress}, ${body.postcode ?? null},
      'google_places', ${place.id}, ${JSON.stringify(place)}::jsonb, 'auditing'
    )
    RETURNING id
  `) as Array<{ id: string }>;

  after(() => runAndStore(inserted[0].id, canonical));

  return NextResponse.json({ id: inserted[0].id, auditing: true });
}

async function runAndStore(prospectId: string, url: string): Promise<void> {
  const start = Date.now();
  try {
    const result = await runStructuredAudit(url);
    if (!result.ok) {
      const status = result.reason === 'waf' ? 'waf_blocked' : 'audit_failed';
      await sql`
        UPDATE prospects
        SET status = ${status},
            audit_data = ${JSON.stringify({ reason: result.reason, pageResults: result.pageResults })}::jsonb,
            updated_at = NOW()
        WHERE id = ${prospectId}
      `;
      return;
    }
    const hit = extractEmailFromHtml(result.rawHtmlByUrl, new URL(url).hostname);
    await sql`
      UPDATE prospects
      SET status = 'audited',
          email = ${hit?.email ?? null},
          email_confidence = ${hit?.confidence ?? null},
          audit_score = ${result.score},
          audit_summary = ${result.summary},
          audit_data = ${JSON.stringify({
            summary: result.summary,
            score: result.score,
            issues: result.issues,
            pageResults: result.pageResults,
            pagesFetched: result.pagesFetched,
            tookMs: Date.now() - start,
          })}::jsonb,
          updated_at = NOW()
      WHERE id = ${prospectId}
    `;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await sql`
      UPDATE prospects
      SET status = 'audit_failed',
          audit_data = ${JSON.stringify({ error: msg })}::jsonb,
          updated_at = NOW()
      WHERE id = ${prospectId}
    `.catch(() => {});
  }
}
