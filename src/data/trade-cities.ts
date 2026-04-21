// Cities supported by the trades matrix. Each entry produces a unique landing page
// per trade × city combination. Copy is deliberately city-specific — suburbs, local
// market conditions, search quirks — so Google does not see duplicate content.

export interface TradeCity {
  slug: string;
  name: string;            // Sydney
  displayName: string;     // "Sydney, NSW"
  state: string;           // NSW / VIC / QLD / WA / SA / ACT / TAS
  stateFull: string;       // New South Wales
  population: string;      // human-readable population band
  intro: string;           // 1 paragraph, city-specific framing
  marketSignal: string;    // 1 paragraph, unique to the city's trade market
  topSuburbs: string[];    // 6 suburbs — used in local SEO footer
  serviceAreaNote: string; // 1 sentence on geography / coverage
  localSeoAngle: string;   // 1 paragraph on how buyers search in this city specifically
  regulatorNote: string;   // 1 line, state-specific regulator / licensing authority
}

export const TRADE_CITIES: TradeCity[] = [
  {
    slug: 'sydney',
    name: 'Sydney',
    displayName: 'Sydney, NSW',
    state: 'NSW',
    stateFull: 'New South Wales',
    population: '5.3 million',
    intro: 'Sydney trades operate across one of the most geographically fragmented city markets in the country — the CBD, eastern suburbs, inner west, North Shore, Northern Beaches, Hills, Hawkesbury, Sutherland, and the sprawling Western Sydney corridor from Parramatta to Penrith are effectively ten sub-markets sharing a single name.',
    marketSignal: 'Sydney buyers search by suburb far more than by "Sydney". A website that ranks for "Sydney [trade]" but not for "[suburb] [trade]" captures a fraction of actual demand. The winning sites carry a suburbs grid with 30+ tagged LocalBusiness entries — not just a city-wide claim.',
    topSuburbs: ['Parramatta', 'Bondi', 'Chatswood', 'Manly', 'Penrith', 'Cronulla'],
    serviceAreaNote: 'Greater Sydney — from Campbelltown in the south-west to Palm Beach in the north.',
    localSeoAngle: 'Sydney search behaviour is the most suburb-specific in Australia. Buyers in Mosman do not want a tradie based in Liverpool and vice versa. Your site needs to be a credible local for at least the suburbs bordering your home base — which means suburb-tagged content, service-area schema, and a visible map of coverage.',
    regulatorNote: 'Licensed by NSW Fair Trading.',
  },
  {
    slug: 'melbourne',
    name: 'Melbourne',
    displayName: 'Melbourne, VIC',
    state: 'VIC',
    stateFull: 'Victoria',
    population: '5.2 million',
    intro: 'Melbourne spreads across a radial rail and tram map that rewards inner-city, middle-ring, and outer-suburb specialisation. Tradies in Brunswick win different jobs to tradies in Frankston, and the buyer is tuned to that reality — Melbournians trust "local" more heavily than almost any other Australian market.',
    marketSignal: 'Melbourne\'s growth corridors — Point Cook, Wyndham Vale, Tarneit, Mernda, Pakenham, Clyde — are booming with new builds and first-time buyers who lean hard on Google for every tradie decision. Ranking for those specific suburbs is a higher-yield play than competing for "Melbourne" alone.',
    topSuburbs: ['Richmond', 'South Yarra', 'Brunswick', 'St Kilda', 'Point Cook', 'Werribee'],
    serviceAreaNote: 'Greater Melbourne — inner, middle-ring, growth corridors, and the Mornington Peninsula.',
    localSeoAngle: 'Melbourne buyers trust tradies who are visibly local to their area. Buyers in Fitzroy want to see a Fitzroy job on your portfolio. Buyers in Berwick want to see a Berwick job. Generic "Melbourne" positioning loses to a site that can prove local presence suburb-by-suburb.',
    regulatorNote: 'Licensed by Consumer Affairs Victoria / VBA.',
  },
  {
    slug: 'brisbane',
    name: 'Brisbane',
    displayName: 'Brisbane, QLD',
    state: 'QLD',
    stateFull: 'Queensland',
    population: '2.6 million',
    intro: 'Brisbane is Australia\'s fastest-growing capital and — critically for trades — its most renovation-heavy. Post-war Queenslanders, post-flood repair demand, and the 2032 Olympics pipeline mean trades here are quoting more often and on shorter timelines than their southern counterparts.',
    marketSignal: 'Brisbane\'s suburbs split cleanly into the inner ring (West End, Paddington, New Farm), the middle (Indooroopilly, Toowong, Bulimba), the booming north (North Lakes, Chermside), and the south (Logan, Mt Gravatt). Buyers Google suburb plus trade — not Brisbane plus trade — and the sites that win rank on the suburb variants.',
    topSuburbs: ['New Farm', 'Paddington', 'Indooroopilly', 'Chermside', 'Bulimba', 'Kenmore'],
    serviceAreaNote: 'Greater Brisbane — from Redcliffe to Logan, plus western corridor out to Ipswich.',
    localSeoAngle: 'Brisbane buyers search with language that betrays the local flavour — "Queenslander", "after-flood", "stumps", "timber deck restumping". A site that picks up that vocabulary in its service pages converts better than one written for a national audience.',
    regulatorNote: 'Licensed by QBCC (Queensland Building and Construction Commission).',
  },
  {
    slug: 'perth',
    name: 'Perth',
    displayName: 'Perth, WA',
    state: 'WA',
    stateFull: 'Western Australia',
    population: '2.2 million',
    intro: 'Perth operates on a two-hour time gap from the eastern states and on a linear north-south sprawl from Two Rocks down to Mandurah. Trades here serve two distinct buyers: a cashed-up mining-income homeowner in the middle ring, and a price-sensitive new-build buyer in the outer corridors (Baldivis, Yanchep, Ellenbrook).',
    marketSignal: 'Perth search is surprisingly low-competition compared to the east coast — well-optimised sites can rank for high-intent terms within months, not years. The trades that dominate are the ones that treat Perth as a distinct market rather than an east-coast afterthought.',
    topSuburbs: ['Subiaco', 'Scarborough', 'Fremantle', 'Joondalup', 'Rockingham', 'Baldivis'],
    serviceAreaNote: 'Perth metro — from Yanchep in the north to Mandurah in the south.',
    localSeoAngle: 'Perth buyers are acutely price-conscious but will pay for local — a Joondalup tradie gets a premium over a Fremantle tradie quoting Joondalup work. Suburb-specific service pages and a visible service-area map meaningfully lift conversion.',
    regulatorNote: 'Licensed by WA Department of Mines, Industry Regulation and Safety.',
  },
  {
    slug: 'adelaide',
    name: 'Adelaide',
    displayName: 'Adelaide, SA',
    state: 'SA',
    stateFull: 'South Australia',
    population: '1.4 million',
    intro: 'Adelaide runs on a compact grid — CBD, inner east, Norwood corridor, western beaches, Adelaide Hills, and the northern suburbs out to Gawler. Trades here benefit from a market where word-of-mouth still drives 40-50% of work, but where Google closes the rest. A credible local site captures the referral traffic that would otherwise die on an unsearched phone number.',
    marketSignal: 'Adelaide\'s heritage housing stock creates outsized demand for restoration-capable trades — stonemasons, plasterers, heritage painters, sandstone cleaners, and period-faithful carpenters. Sites that specialise on heritage explicitly outrank the all-purpose tradie for premium jobs.',
    topSuburbs: ['Norwood', 'Glenelg', 'Unley', 'Prospect', 'Semaphore', 'Mawson Lakes'],
    serviceAreaNote: 'Metropolitan Adelaide — from Gawler to Aldinga, plus Adelaide Hills and McLaren Vale.',
    localSeoAngle: 'Adelaide buyers skew older than other capital markets and place a higher premium on years-in-business, local references, and visible testimonials. Sites that surface all three in the first scroll outperform slick but anonymous competitors.',
    regulatorNote: 'Licensed by Consumer and Business Services SA.',
  },
  {
    slug: 'gold-coast',
    name: 'Gold Coast',
    displayName: 'Gold Coast, QLD',
    state: 'QLD',
    stateFull: 'Queensland',
    population: '720,000',
    intro: 'The Gold Coast\'s tradie market runs hot — tourism-driven renovation cycles, coastal-maintenance demand, strata-heavy high-rise work, and a steady flow of interstate retiree renovations. The buyer mix is a split between Southern-migrated homeowners who Google everything and long-time locals who still ring a number on a ute.',
    marketSignal: 'Coastal corrosion, pool-area humidity, and strata fitouts drive demand that the typical "tradie" website is too generic to serve. Trades that specifically address coastal-grade materials, strata-compatible booking, and high-rise access convert measurably better.',
    topSuburbs: ['Surfers Paradise', 'Broadbeach', 'Burleigh Heads', 'Robina', 'Coomera', 'Varsity Lakes'],
    serviceAreaNote: 'Gold Coast region — from Coomera in the north to Coolangatta in the south, plus Tweed Heads NSW where applicable.',
    localSeoAngle: 'Gold Coast searches skew to specific suburbs — Burleigh buyers do not want a Coomera tradie driving 30 minutes. Local-suburb content and a real service-area map outperform "Gold Coast wide" claims.',
    regulatorNote: 'Licensed by QBCC (Queensland Building and Construction Commission).',
  },
  {
    slug: 'canberra',
    name: 'Canberra',
    displayName: 'Canberra, ACT',
    state: 'ACT',
    stateFull: 'Australian Capital Territory',
    population: '460,000',
    intro: 'Canberra\'s tradie market is unusual: a single-employer town (federal government), a young demographic, a huge rental-housing sector, and a climate (frost, snow, extreme summer) that punishes poorly specified work. Trades that quote and deliver to that brief outperform generic-national competitors who treat Canberra as a smaller Sydney.',
    marketSignal: 'ACT buyers are acutely qualification-conscious — they check licences, insurance, and standards compliance more often than any other capital. Sites that frontload the credentials and cite the right ACT-specific standards (WorkSafe ACT, ACT Building Act) convert better.',
    topSuburbs: ['Civic', 'Kingston', 'Woden', 'Belconnen', 'Tuggeranong', 'Gungahlin'],
    serviceAreaNote: 'Canberra and surrounds — Queanbeyan NSW where applicable.',
    localSeoAngle: 'Canberra has relatively low tradie-SEO competition and high buyer research intent. A well-structured site can rank within months and capture a highly informed buyer willing to pay for compliance and quality.',
    regulatorNote: 'Licensed by Access Canberra.',
  },
  {
    slug: 'hobart',
    name: 'Hobart',
    displayName: 'Hobart, TAS',
    state: 'TAS',
    stateFull: 'Tasmania',
    population: '250,000',
    intro: 'Hobart is a small, dense market with a distinct sub-market on the eastern shore (Clarence) and rising demand driven by mainland retirees and remote-work migration. Trades that balance heritage capability with modern-build efficiency tend to dominate.',
    marketSignal: 'Tasmania\'s heritage stock, high rainfall, and older housing create demand for weatherproofing, re-roofing, and heritage-capable trades at a per-capita rate above the national average. Low competitor density online rewards any tradie with a half-decent website.',
    topSuburbs: ['Sandy Bay', 'Battery Point', 'Kingston', 'Glenorchy', 'Rosny Park', 'Moonah'],
    serviceAreaNote: 'Greater Hobart — from Huonville to Sorell, including the eastern shore.',
    localSeoAngle: 'Hobart\'s online competition is thinner than any mainland capital. A well-built site can own multiple suburb-level rankings quickly, but needs to feel locally credible — a Hobart buyer will spot a mainland-template site in seconds.',
    regulatorNote: 'Licensed by Consumer, Building and Occupational Services (Tasmania).',
  },
];

export const CITY_MAP: Record<string, TradeCity> = Object.fromEntries(
  TRADE_CITIES.map((c) => [c.slug, c])
);

export const CITY_SLUGS = TRADE_CITIES.map((c) => c.slug);
