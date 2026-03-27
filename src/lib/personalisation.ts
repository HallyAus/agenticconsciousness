export type PersonalisedContent = {
  tagline: string;
  headline1: string;
  headline2: string;
  description: string;
  showLocation?: string;
};

export const DEFAULT: PersonalisedContent = {
  tagline: '',
  headline1: 'AGENTIC',
  headline2: 'CONSCIOUSNESS',
  description: 'We build AI systems that think, decide, and act — so your team can focus on what humans do best.',
};

export const LOCATIONS: Record<string, PersonalisedContent> = {
  brisbane: {
    tagline: 'AI FOR / BRISBANE',
    headline1: 'AGENTIC',
    headline2: 'CONSCIOUSNESS',
    description: "Brisbane's businesses are going autonomous. From South Bank to Fortitude Valley, we're helping Queensland companies deploy AI that works while you sleep.",
    showLocation: 'Brisbane',
  },
  sydney: {
    tagline: 'AI FOR / SYDNEY',
    headline1: 'AGENTIC',
    headline2: 'CONSCIOUSNESS',
    description: "Sydney moves fast. Your AI should too. We build autonomous systems for Sydney businesses that need to stay ahead in one of the world's most competitive markets.",
    showLocation: 'Sydney',
  },
  melbourne: {
    tagline: 'AI FOR / MELBOURNE',
    headline1: 'AGENTIC',
    headline2: 'CONSCIOUSNESS',
    description: "Melbourne's smartest businesses are already running on AI. Strategy, implementation, and automation — built for the Melbourne market.",
    showLocation: 'Melbourne',
  },
  perth: {
    tagline: 'AI FOR / PERTH',
    headline1: 'AGENTIC',
    headline2: 'CONSCIOUSNESS',
    description: 'From mining to professional services, Perth businesses are embracing AI to compete globally. We make that transition seamless.',
    showLocation: 'Perth',
  },
  adelaide: {
    tagline: 'AI FOR / ADELAIDE',
    headline1: 'AGENTIC',
    headline2: 'CONSCIOUSNESS',
    description: "Adelaide's defence, manufacturing, and professional services sectors are transforming with AI. We help you lead that change.",
    showLocation: 'Adelaide',
  },
  'gold-coast': {
    tagline: 'AI FOR / GOLD COAST',
    headline1: 'AGENTIC',
    headline2: 'CONSCIOUSNESS',
    description: 'Tourism, property, services — Gold Coast businesses are using AI to scale without adding headcount. Join them.',
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
