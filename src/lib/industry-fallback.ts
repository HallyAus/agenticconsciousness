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

// Curated Unsplash photo URLs. 4-6 per trade so the mockup pipeline has
// enough variety to populate a hero + service cards. All free for
// commercial use under the Unsplash License (no attribution required).
// Sized w=1440 q=70 for the PDF; the mockup hotlinks them at the same URL
// (Unsplash CDN handles further resizing via &w= when needed).
const TRADE_PHOTOSETS: Record<string, string[]> = {
  electrician: [
    'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1605152276897-4f618f831968?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1565608438257-fac3c27beb36?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1440&q=70&fit=crop',
  ],
  plumber: [
    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1542013936693-884638332954?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1440&q=70&fit=crop',
  ],
  roofer: [
    'https://images.unsplash.com/photo-1632759145355-8b8f0f6f0b75?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1632759145351-1d76a8b0d9d6?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1572985003693-d3f79da59030?w=1440&q=70&fit=crop',
  ],
  painter: [
    'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1572297787411-1d4a3a1da0c3?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=1440&q=70&fit=crop',
  ],
  carpenter: [
    'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1611243705810-e2e8d4f1cf27?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1601058268499-e52658b8bb88?w=1440&q=70&fit=crop',
  ],
  landscaper: [
    'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1599629954294-14df9ec8bc03?w=1440&q=70&fit=crop',
  ],
  cleaner: [
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1581578017093-cd30fce4eeb7?w=1440&q=70&fit=crop',
  ],
  mechanic: [
    'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1632823471565-1ecdf5c6da77?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1493238792000-8113da705763?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1440&q=70&fit=crop',
  ],
  hvac: [
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1633113087281-4d0c95cc2475?w=1440&q=70&fit=crop',
  ],
  tiler: [
    'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1440&q=70&fit=crop',
  ],
  concreter: [
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1440&q=70&fit=crop',
  ],
  fencer: [
    'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1440&q=70&fit=crop',
  ],
  pool: [
    'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1440&q=70&fit=crop',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1440&q=70&fit=crop',
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1440&q=70&fit=crop',
  ],
  hairdresser: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1440&q=70&fit=crop',
  ],
  florist: [
    'https://images.unsplash.com/photo-1487070183336-b863922373d4?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1559563458-527698bf5295?w=1440&q=70&fit=crop',
  ],
  gym: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1440&q=70&fit=crop',
  ],
  dentist: [
    'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1440&q=70&fit=crop',
  ],
  physio: [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1571019613540-996a64e5a4e8?w=1440&q=70&fit=crop',
  ],
  lawyer: [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1440&q=70&fit=crop',
  ],
  accountant: [
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1440&q=70&fit=crop',
  ],
  realestate: [
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1440&q=70&fit=crop',
  ],
  pet: [
    'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1440&q=70&fit=crop',
  ],
  photographer: [
    'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=1440&q=70&fit=crop',
    'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1440&q=70&fit=crop',
  ],
};

// Single-image lookup retained as a derived view of the photoset, so the
// PDF desktop fallback (which only needs one) keeps working.
const TRADE_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(TRADE_PHOTOSETS).map(([k, v]) => [k, v[0]]),
);

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

/**
 * Like pickIndustryFallback() but returns the whole photoset for the
 * matched trade. Used by the mockup pipeline to pad branding.images
 * when site scraping returned too few real photos. Returns up to `max`
 * URLs (default 5). Returns [] when no trade matches.
 */
export function pickIndustryFallbackImages(
  placeData: PlaceLike | null | undefined,
  businessName: string | null | undefined,
  url: string | null | undefined,
  max: number = 5,
): string[] {
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
      const photoset = TRADE_PHOTOSETS[m.slug] ?? [];
      return photoset.slice(0, max);
    }
  }

  return [];
}
