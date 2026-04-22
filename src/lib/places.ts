/**
 * Google Places API (New) — text search wrapper.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 *
 * Returns up to 60 results across 3 paginated requests (Places caps at 20
 * per page, nextPageToken for up to 3 pages). Each request billed at the
 * Text Search SKU (~$17/1000 after free tier).
 *
 * Field mask is deliberately small — only the fields we store.
 */

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACE_DETAILS_URL = (placeId: string) =>
  `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.primaryType',
  'places.types',
  'places.location',
  'places.businessStatus',
  'nextPageToken',
].join(',');

export interface PlaceResult {
  id: string;
  displayName: string;
  formattedAddress: string | null;
  websiteUri: string | null;
  phone: string | null;
  rating: number | null;
  userRatingCount: number | null;
  primaryType: string | null;
  types: string[];
  businessStatus: string | null;
  location: { latitude: number; longitude: number } | null;
}

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
  location?: { latitude: number; longitude: number };
}

export function isPlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

/**
 * Filter out results we never want to outreach:
 *   - petrol / gas stations (chain-owned or generic)
 *   - major chain brands in AU (supermarkets, hardware, fast food, retail, chain cafés,
 *     chain childcare, chain garden centres)
 *
 * Chain detection is name-based and intentionally conservative — false positives are
 * preferable to outreaching a franchise. Add new patterns at will.
 */
const CHAIN_NAME_PATTERNS: RegExp[] = [
  // Petrol
  /\b(bp|shell|caltex|ampol|7-eleven|seven eleven|mobil|united petroleum|liberty oil|metro petroleum|puma energy)\b/i,
  // Supermarkets + convenience
  /\b(woolworths|coles|aldi|iga|foodworks|costco|harris farm)\b/i,
  // Hardware / big box
  /\b(bunnings|total tools|mitre 10|home timber|tradelink|reece)\b/i,
  // Fast food / coffee chains
  /\b(mcdonald|kfc|subway|hungry jack|domino|pizza hut|red rooster|oporto|nando|guzman|starbucks|gloria jean|coffee club|muffin break|michel'?s patisserie|jamaica blue|the coffee club)\b/i,
  // Retail chains
  /\b(kmart|target\b|big w|harvey norman|jb hi-?fi|officeworks|the good guys|spotlight|rebel sport|anaconda|chemist warehouse|priceline|terry white)\b/i,
  // Childcare chains
  /\b(goodstart|g8 education|only about children|kids academy|petit early learning)\b/i,
  // Garden / nursery chains
  /\b(flower power|grow master|waldecks|the garden gurus)\b/i,
  // Banks + telcos that sometimes show up
  /\b(commonwealth bank|westpac|nab|anz|telstra|optus|vodafone)\b/i,
];

const PETROL_TYPES = new Set(['gas_station']);

function isExcluded(p: PlaceResult): boolean {
  if (p.types.some((t) => PETROL_TYPES.has(t))) return true;
  if (p.primaryType && PETROL_TYPES.has(p.primaryType)) return true;
  const name = p.displayName ?? '';
  for (const pat of CHAIN_NAME_PATTERNS) {
    if (pat.test(name)) return true;
  }
  return false;
}

export async function searchPlaces(args: { postcode: string; category: string }): Promise<PlaceResult[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY not set');

  const textQuery = `${args.category} in ${args.postcode} Australia`;
  const results: PlaceResult[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;

  for (let page = 0; page < 3; page++) {
    const body: Record<string, unknown> = {
      textQuery,
      regionCode: 'AU',
      pageSize: 20,
    };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch(PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Places search failed: ${res.status} ${text.slice(0, 400)}`);
    }
    const data = (await res.json()) as { places?: RawPlace[]; nextPageToken?: string };
    for (const raw of data.places ?? []) {
      if (seen.has(raw.id)) continue;
      seen.add(raw.id);
      const place: PlaceResult = {
        id: raw.id,
        displayName: raw.displayName?.text ?? '',
        formattedAddress: raw.formattedAddress ?? null,
        websiteUri: raw.websiteUri ?? null,
        phone: raw.nationalPhoneNumber ?? raw.internationalPhoneNumber ?? null,
        rating: raw.rating ?? null,
        userRatingCount: raw.userRatingCount ?? null,
        primaryType: raw.primaryType ?? null,
        types: raw.types ?? [],
        businessStatus: raw.businessStatus ?? null,
        location: raw.location ?? null,
      };
      if (isExcluded(place)) continue;
      results.push(place);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
    // Places requires a short delay before a pageToken is usable.
    await new Promise((r) => setTimeout(r, 1500));
  }

  return results;
}

export interface PlaceReview {
  author: string;
  rating: number | null;
  text: string;
  relativeTime: string | null;
  publishTime: string | null;
}

export interface PlaceDetails {
  reviews: PlaceReview[];
  rating: number | null;
  userRatingCount: number | null;
}

/**
 * Fetch Place Details — the Places API (New) returns up to 5 user reviews.
 * Used by audit-enrich to populate real testimonials in the mockup.
 *
 * Fields billed at the Place Details (Pro) SKU (~$17/1000 after free tier)
 * because `reviews` is a Pro-tier field. Callers should dedupe (we call
 * once per prospect at audit time, not per preview).
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  if (!placeId) return null;

  const fieldMask = ['reviews', 'rating', 'userRatingCount'].join(',');

  const res = await fetch(`${PLACE_DETAILS_URL(placeId)}?languageCode=en`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[places] details failed', res.status, text.slice(0, 400));
    return null;
  }

  const data = (await res.json()) as {
    reviews?: Array<{
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      relativePublishTimeDescription?: string;
      publishTime?: string;
      authorAttribution?: { displayName?: string };
    }>;
    rating?: number;
    userRatingCount?: number;
  };

  const reviews: PlaceReview[] = (data.reviews ?? [])
    .map((r) => ({
      author: r.authorAttribution?.displayName ?? 'Google reviewer',
      rating: r.rating ?? null,
      text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
      relativeTime: r.relativePublishTimeDescription ?? null,
      publishTime: r.publishTime ?? null,
    }))
    // Drop empty reviews and 1-star complaints — we're building a
    // testimonial section, not an ombudsman report.
    .filter((r) => r.text.length > 20 && (r.rating === null || r.rating >= 4))
    .slice(0, 5);

  return {
    reviews,
    rating: data.rating ?? null,
    userRatingCount: data.userRatingCount ?? null,
  };
}
