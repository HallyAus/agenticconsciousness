/**
 * Industry-specific fallback image picker.
 *
 * When ScreenshotOne fails to capture a prospect's site (firewall block,
 * timeout, redirect loop, dead site), we still want the "Your site, right
 * now" page in the PDF to carry a relevant visual. Without it the report
 * looks like we forgot a page.
 *
 * The picker maps a prospect's Google Places primary/types (or, as a
 * weaker fallback, keywords in the URL/business name) to a curated
 * Unsplash photo URL. Unsplash content is free for commercial use under
 * the Unsplash License — no attribution required, hotlinking is allowed
 * (https://unsplash.com/license).
 *
 * If a local override exists at /public/fallback/{slug}.jpg it would be
 * preferred — but we don't currently bundle local overrides since
 * Vercel's CDN serves Unsplash CDN images just as fast.
 *
 * Returns null when no useful fallback can be inferred — the PDF should
 * then omit the page (current behaviour) rather than show a generic
 * stock photo with no relevance.
 */

interface PlaceLike {
  primaryType?: string | null;
  types?: string[] | null;
}

// Trade slug -> array of matching Google Places type strings + free-text
// keywords. Keep keywords lowercase. Order matters within MATCHERS — the
// first slug whose patterns match wins.
const MATCHERS: Array<{ slug: string; placeTypes: string[]; keywords: string[] }> = [
  { slug: 'electrician',  placeTypes: ['electrician'],                                 keywords: ['electric', 'electrician', 'electrical'] },
  { slug: 'plumber',      placeTypes: ['plumber'],                                     keywords: ['plumb', 'plumber', 'drain'] },
  { slug: 'roofer',       placeTypes: ['roofing_contractor'],                          keywords: ['roofing', 'roofer', 'gutter'] },
  { slug: 'painter',      placeTypes: ['painter'],                                     keywords: ['painter', 'painting'] },
  { slug: 'carpenter',    placeTypes: ['carpenter'],                                   keywords: ['carpenter', 'carpentry', 'joinery'] },
  { slug: 'landscaper',   placeTypes: ['landscaper', 'lawn_care_service'],             keywords: ['landscap', 'lawn', 'garden', 'turf', 'mowing'] },
  { slug: 'cleaner',      placeTypes: ['house_cleaning_service', 'cleaning_service', 'janitor_service'], keywords: ['clean', 'cleaner', 'cleaning'] },
  { slug: 'mechanic',     placeTypes: ['car_repair', 'auto_repair_shop'],              keywords: ['mechanic', 'auto', 'car repair'] },
  { slug: 'hvac',         placeTypes: ['hvac_contractor'],                             keywords: ['hvac', 'air condition', 'heating', 'cooling'] },
  { slug: 'tiler',        placeTypes: [],                                              keywords: ['tiler', 'tiling', 'tile'] },
  { slug: 'concreter',    placeTypes: [],                                              keywords: ['concrete', 'concreter'] },
  { slug: 'fencer',       placeTypes: [],                                              keywords: ['fencing', 'fencer'] },
  { slug: 'pool',         placeTypes: [],                                              keywords: ['pool service', 'pool care', 'pool cleaning'] },
  { slug: 'cafe',         placeTypes: ['cafe', 'coffee_shop'],                         keywords: ['cafe', 'coffee', 'espresso'] },
  { slug: 'restaurant',   placeTypes: ['restaurant', 'meal_delivery', 'meal_takeaway'], keywords: ['restaurant', 'kitchen', 'dining'] },
  { slug: 'hairdresser',  placeTypes: ['hair_salon', 'hair_care', 'beauty_salon'],     keywords: ['hairdresser', 'salon', 'barber'] },
  { slug: 'florist',      placeTypes: ['florist'],                                     keywords: ['florist', 'flower'] },
  { slug: 'gym',          placeTypes: ['gym', 'fitness_center'],                       keywords: ['gym', 'fitness', 'crossfit', 'personal training'] },
  { slug: 'dentist',      placeTypes: ['dentist'],                                     keywords: ['dentist', 'dental'] },
  { slug: 'physio',       placeTypes: ['physiotherapist'],                             keywords: ['physio', 'physiotherap', 'osteo', 'chiro'] },
  { slug: 'lawyer',       placeTypes: ['lawyer'],                                      keywords: ['lawyer', 'solicitor', 'legal', 'law firm'] },
  { slug: 'accountant',   placeTypes: ['accounting'],                                  keywords: ['accountant', 'accounting', 'bookkeep'] },
  { slug: 'realestate',   placeTypes: ['real_estate_agency'],                          keywords: ['real estate', 'realty', 'property'] },
  { slug: 'pet',          placeTypes: ['veterinary_care', 'pet_groomer', 'pet_store'], keywords: ['vet', 'veterinary', 'groomer', 'pet'] },
  { slug: 'photographer', placeTypes: ['photographer'],                                keywords: ['photographer', 'photography'] },
];

// Curated Unsplash photo URLs. Each is a real, on-topic photo. Sized to
// 1440 wide so the PDF render scales cleanly; q=70 to keep payload small.
// All are free for commercial use under the Unsplash License.
const TRADE_IMAGES: Record<string, string> = {
  electrician:  'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1440&q=70&fit=crop',
  plumber:      'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1440&q=70&fit=crop',
  roofer:       'https://images.unsplash.com/photo-1632759145355-8b8f0f6f0b75?w=1440&q=70&fit=crop',
  painter:      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1440&q=70&fit=crop',
  carpenter:    'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1440&q=70&fit=crop',
  landscaper:   'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1440&q=70&fit=crop',
  cleaner:      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1440&q=70&fit=crop',
  mechanic:     'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=1440&q=70&fit=crop',
  hvac:         'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1440&q=70&fit=crop',
  tiler:        'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1440&q=70&fit=crop',
  concreter:    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1440&q=70&fit=crop',
  fencer:       'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=1440&q=70&fit=crop',
  pool:         'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1440&q=70&fit=crop',
  cafe:         'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1440&q=70&fit=crop',
  restaurant:   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1440&q=70&fit=crop',
  hairdresser:  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1440&q=70&fit=crop',
  florist:      'https://images.unsplash.com/photo-1487070183336-b863922373d4?w=1440&q=70&fit=crop',
  gym:          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1440&q=70&fit=crop',
  dentist:      'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1440&q=70&fit=crop',
  physio:       'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1440&q=70&fit=crop',
  lawyer:       'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1440&q=70&fit=crop',
  accountant:   'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1440&q=70&fit=crop',
  realestate:   'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1440&q=70&fit=crop',
  pet:          'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1440&q=70&fit=crop',
  photographer: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1440&q=70&fit=crop',
};

const TRADE_LABELS: Record<string, string> = {
  electrician:  'ELECTRICAL',
  plumber:      'PLUMBING',
  roofer:       'ROOFING',
  painter:      'PAINTING',
  carpenter:    'CARPENTRY',
  landscaper:   'LANDSCAPING',
  cleaner:      'CLEANING',
  mechanic:     'AUTOMOTIVE',
  hvac:         'HVAC',
  tiler:        'TILING',
  concreter:    'CONCRETING',
  fencer:       'FENCING',
  pool:         'POOL CARE',
  cafe:         'HOSPITALITY',
  restaurant:   'HOSPITALITY',
  hairdresser:  'BEAUTY',
  florist:      'FLORAL',
  gym:          'FITNESS',
  dentist:      'DENTAL',
  physio:       'ALLIED HEALTH',
  lawyer:       'LEGAL',
  accountant:   'ACCOUNTING',
  realestate:   'REAL ESTATE',
  pet:          'VETERINARY',
  photographer: 'PHOTOGRAPHY',
};

export interface IndustryFallback {
  slug: string;
  url: string;
  label: string;
}

/**
 * Pick an industry-specific fallback image for a prospect.
 *
 * Resolution order:
 *   1. place_data.primaryType matches a known trade type
 *   2. any place_data.types entry matches a known trade type
 *   3. business name OR URL hostname contains a trade keyword
 *   4. null (no useful fallback — caller should skip the page)
 */
export function pickIndustryFallback(
  placeData: PlaceLike | null | undefined,
  businessName: string | null | undefined,
  url: string | null | undefined,
): IndustryFallback | null {
  const types: string[] = [];
  if (placeData?.primaryType) types.push(placeData.primaryType.toLowerCase());
  if (placeData?.types) types.push(...placeData.types.map((t) => t.toLowerCase()));

  const haystack = [
    businessName ?? '',
    (() => {
      try { return new URL(url ?? '').hostname.replace(/^www\./, ''); } catch { return url ?? ''; }
    })(),
  ].join(' ').toLowerCase();

  for (const m of MATCHERS) {
    const typeHit = m.placeTypes.some((t) => types.includes(t));
    const keywordHit = !typeHit && m.keywords.some((k) => haystack.includes(k));
    if (typeHit || keywordHit) {
      const url = TRADE_IMAGES[m.slug];
      const label = TRADE_LABELS[m.slug] ?? m.slug.toUpperCase();
      if (!url) return null;
      return { slug: m.slug, url, label };
    }
  }

  return null;
}
