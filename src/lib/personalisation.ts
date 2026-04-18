export type PersonalisedContent = {
  tagline: string;
  headline1: string;
  headline2: string;
  description: string;
  showLocation?: string;
};

export const DEFAULT: PersonalisedContent = {
  tagline: '',
  headline1: 'AI THAT',
  headline2: 'SHIPS.',
  description: 'For Australian businesses scaling with AI instead of headcount. Daniel personally scopes, builds, and hands over every engagement inside 2\u20138 weeks. 21 years of industry experience, one person start to finish \u2014 no slide decks, no junior account manager.',
};

export const LOCATIONS: Record<string, PersonalisedContent> = {
  brisbane: {
    tagline: 'AI FOR / BRISBANE',
    headline1: 'AI FOR',
    headline2: 'BRISBANE.',
    description: "From South Bank to Fortitude Valley, Brisbane SMEs are cutting overhead with agentic AI. Fixed-scope engagements, delivered in 2\u20138 weeks by the same person who scoped them.",
    showLocation: 'Brisbane',
  },
  sydney: {
    tagline: 'AI FOR / SYDNEY',
    headline1: 'AI FOR',
    headline2: 'SYDNEY.',
    description: "Sydney businesses move fast. Your AI rollout should too. Scoped AI projects shipped inside 2\u20138 weeks \u2014 direct with Daniel, no agency overhead.",
    showLocation: 'Sydney',
  },
  melbourne: {
    tagline: 'AI FOR / MELBOURNE',
    headline1: 'AI FOR',
    headline2: 'MELBOURNE.',
    description: "Melbourne\u2019s sharpest SMEs are replacing admin with agents. Strategy, implementation, and automation \u2014 built for the Melbourne market, priced flat.",
    showLocation: 'Melbourne',
  },
  perth: {
    tagline: 'AI FOR / PERTH',
    headline1: 'AI FOR',
    headline2: 'PERTH.',
    description: 'From the Pilbara to West Perth, WA businesses are embracing AI to compete globally without scaling headcount. Async-friendly delivery across the two-hour time gap.',
    showLocation: 'Perth',
  },
  adelaide: {
    tagline: 'AI FOR / ADELAIDE',
    headline1: 'AI FOR',
    headline2: 'ADELAIDE.',
    description: "Adelaide\u2019s defence, manufacturing, and professional-services sectors are transforming with AI. Scoped engagements, delivered in weeks, handed over for good.",
    showLocation: 'Adelaide',
  },
  'gold-coast': {
    tagline: 'AI FOR / GOLD COAST',
    headline1: 'AI FOR',
    headline2: 'GOLD COAST.',
    description: 'Tourism, property, services \u2014 Gold Coast businesses are scaling with AI instead of hiring. Same-week starter offers, fixed-scope projects for bigger builds.',
    showLocation: 'Gold Coast',
  },
};

export const INDUSTRIES: Record<string, PersonalisedContent> = {
  manufacturing: {
    tagline: 'SMARTER / FACTORIES',
    headline1: 'SMARTER',
    headline2: 'FACTORIES',
    description: 'AI-powered quality inspection, predictive maintenance, and production scheduling. Built for Australian manufacturers.',
  },
  trades: {
    tagline: 'AI FOR / TRADIES',
    headline1: 'AI FOR',
    headline2: 'TRADIES',
    description: 'Quoting, scheduling, and customer comms — on autopilot. AI built specifically for trades and service businesses.',
  },
  'professional-services': {
    tagline: 'BILLABLE / INTELLIGENCE',
    headline1: 'BILLABLE',
    headline2: 'INTELLIGENCE',
    description: 'AI-augmented proposals, document review, and client management. More billable hours, less admin.',
  },
  healthcare: {
    tagline: 'HEALTHIER / SYSTEMS',
    headline1: 'HEALTHIER',
    headline2: 'SYSTEMS',
    description: 'AI scheduling, documentation, and admin automation for healthcare providers. Spend more time on patients, less on paperwork.',
  },
  retail: {
    tagline: 'SELL / SMARTER',
    headline1: 'SELL',
    headline2: 'SMARTER',
    description: 'AI inventory forecasting, customer service, and marketing automation. Built for retail and e-commerce.',
  },
  finance: {
    tagline: 'SMARTER / FINANCE',
    headline1: 'SMARTER',
    headline2: 'FINANCE',
    description: 'AI document processing, compliance automation, and financial analysis. Faster closes, fewer errors.',
  },
};

export const REFERRER_TWEAKS: Record<string, Partial<PersonalisedContent>> = {
  google: {
    tagline: 'FOUND US / ON GOOGLE',
  },
  linkedin: {
    tagline: 'AI FOR / PROFESSIONALS',
  },
  facebook: {
    tagline: 'AI FOR / BUSINESS',
  },
};

function getSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/for\/([^/]+)/);
  return match ? match[1] : null;
}

function getReferrerSource(referrer: string): string | null {
  if (!referrer) return null;
  if (referrer.includes('google.')) return 'google';
  if (referrer.includes('linkedin.')) return 'linkedin';
  if (referrer.includes('facebook.') || referrer.includes('fb.')) return 'facebook';
  return null;
}

export function getPersonalisedContent(): PersonalisedContent {
  if (typeof window === 'undefined') return DEFAULT;

  const pathname = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // 1. URL path — /for/[slug]
  const slug = getSlugFromPath(pathname);
  if (slug) {
    const locationMatch = LOCATIONS[slug];
    if (locationMatch) return locationMatch;
    const industryMatch = INDUSTRIES[slug];
    if (industryMatch) return industryMatch;
  }

  // 2. UTM params
  const utmSource = params.get('utm_source')?.toLowerCase() ?? '';
  const utmContent = params.get('utm_content')?.toLowerCase() ?? '';
  const utmCampaign = params.get('utm_campaign')?.toLowerCase() ?? '';

  const utmSlug = utmContent || utmCampaign || utmSource;

  if (utmSlug) {
    const locationMatch = LOCATIONS[utmSlug];
    if (locationMatch) return locationMatch;
    const industryMatch = INDUSTRIES[utmSlug];
    if (industryMatch) return industryMatch;
  }

  // 3. Referrer tweaks
  const referrer = document.referrer;
  const referrerSource = getReferrerSource(referrer);
  if (referrerSource && REFERRER_TWEAKS[referrerSource]) {
    return { ...DEFAULT, ...REFERRER_TWEAKS[referrerSource] };
  }

  // 4. Default
  return DEFAULT;
}
