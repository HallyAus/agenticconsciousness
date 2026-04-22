import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/pg';
import { searchPlaces, isPlacesConfigured, type PlaceResult } from '@/lib/places';

/**
 * Admin-only. Search Google Places by postcode + category. Results cached
 * for 7 days per (postcode, category) key.
 *
 * Body: { postcode: string, category: string, refresh?: boolean }
 */

const CACHE_TTL_DAYS = 7;

interface CacheRow {
  results_json: PlaceResult[];
  fetched_at: string;
  result_count: number;
}

interface ExistingRow {
  source_place_id: string;
  id: string;
  status: string;
}

export async function POST(req: NextRequest) {
  if (!isPlacesConfigured()) {
    return NextResponse.json(
      { error: 'Google Places not configured. Set GOOGLE_PLACES_API_KEY.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const postcode = String(body.postcode ?? '').trim();
  const category = String(body.category ?? '').trim().toLowerCase();
  const refresh = Boolean(body.refresh);

  if (!/^\d{4}$/.test(postcode)) {
    return NextResponse.json({ error: 'Postcode must be a 4-digit AU postcode.' }, { status: 400 });
  }
  if (!category || category.length > 120) {
    return NextResponse.json({ error: 'Category is required (e.g. "plumbers").' }, { status: 400 });
  }

  let cached: PlaceResult[] | null = null;
  let fromCache = false;
  let fetchedAt: string | null = null;

  if (!refresh) {
    const rows = (await sql`
      SELECT results_json, fetched_at, result_count
      FROM prospect_searches
      WHERE postcode = ${postcode} AND lower(category) = ${category}
        AND fetched_at > NOW() - (${CACHE_TTL_DAYS}::int || ' days')::interval
      LIMIT 1
    `) as CacheRow[];
    if (rows.length > 0) {
      cached = rows[0].results_json;
      fetchedAt = rows[0].fetched_at;
      fromCache = true;
    }
  }

  let results: PlaceResult[];
  if (cached) {
    results = cached;
  } else {
    try {
      results = await searchPlaces({ postcode, category });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'search failed';
      console.error('[admin/places] search failed', msg);
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    // Upsert: the unique index is on (postcode, lower(category)) — avoid
    // ON CONFLICT with expression-indexes, use delete-then-insert.
    await sql`
      DELETE FROM prospect_searches
      WHERE postcode = ${postcode} AND lower(category) = ${category}
    `;
    await sql`
      INSERT INTO prospect_searches (postcode, category, results_json, result_count)
      VALUES (${postcode}, ${category}, ${JSON.stringify(results)}::jsonb, ${results.length})
    `;
    fetchedAt = new Date().toISOString();
  }

  // Enrich with "already added" marker so the UI can grey out existing prospects.
  const placeIds = results.map((r) => r.id);
  let existing: ExistingRow[] = [];
  if (placeIds.length > 0) {
    existing = (await sql`
      SELECT source_place_id, id, status
      FROM prospects
      WHERE source_place_id = ANY(${placeIds}::text[])
    `) as ExistingRow[];
  }
  const existingMap = new Map(existing.map((e) => [e.source_place_id, e]));

  const enriched = results.map((r) => ({
    ...r,
    existingProspectId: existingMap.get(r.id)?.id ?? null,
    existingStatus: existingMap.get(r.id)?.status ?? null,
  }));

  return NextResponse.json({
    postcode,
    category,
    fromCache,
    fetchedAt,
    count: enriched.length,
    results: enriched,
  });
}
