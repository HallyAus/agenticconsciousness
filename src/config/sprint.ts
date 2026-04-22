/**
 * Single source of truth for all audit-as-sales-asset numbers that
 * change independently of code. Update here, everything downstream
 * (PDF renderer, revenue calculator, CTA page, trust page) follows.
 *
 * House rules:
 *   - Testimonials must be real. If the array is empty, the trust page
 *     omits the testimonial block instead of fabricating.
 *   - Monthly remaining must be honest — this drives scarcity copy on
 *     the trust page. Lying damages credibility faster than missing.
 */

export interface Testimonial {
  /** First name + last-name initial, or full business name. Real humans only. */
  author: string;
  /** Their business or role (e.g. "Owner, Reach Pilot"). */
  role: string;
  /** 1-3 sentences. ASCII punctuation only, no em/en dashes. */
  quote: string;
  /** Optional link back to a live site proving they exist. */
  sourceUrl?: string;
}

export interface SprintConfig {
  /** Where the CTA QR code + "AGENTICCONSCIOUSNESS.COM.AU/BOOK" links point. */
  bookingUrl: string;
  /** Headline price (AUD). */
  priceAud: number;
  /** Agency anchor shown directly above the $999 price to trigger the contrast.
   *  Keep the low/high honest — this is defensible even under scrutiny. */
  agencyAnchor: { lowAud: number; highAud: number; weeksLow: number; weeksHigh: number };
  /** How many Lightning Website Sprint slots we can realistically deliver per
   *  calendar month without blowing the 48-hour promise. */
  monthlyCapacity: number;
  /** Slots still open in the current month. Update honestly. Shown as
   *  scarcity signal: "remaining this month: Y". */
  remainingThisMonth: number;
  /** Up to 3 real testimonials. Empty array is fine — testimonial block
   *  then renders nothing. Never invent copy here. */
  testimonials: Testimonial[];
}

export const SPRINT_CONFIG: SprintConfig = {
  bookingUrl: 'https://agenticconsciousness.com.au/book',
  priceAud: 999,
  agencyAnchor: { lowAud: 4500, highAud: 8000, weeksLow: 6, weeksHigh: 8 },
  monthlyCapacity: 6,
  // Placeholder — Daniel should update each month. No automatic counter.
  remainingThisMonth: 3,
  // House rule: real testimonials only. Empty until Daniel drops real ones in.
  testimonials: [],
};

/**
 * Average job value by vertical, used by the revenue-impact calculator
 * to translate "you're losing X% of visitors" into dollars per year.
 *
 * Conservative defaults — we'd rather under-promise in the audit than
 * publish a number we'd have to defend with hand-wavy assumptions.
 *
 * Vertical matched against Google Places primaryType, which we already
 * store on prospects.place_data. Fallback is 'default' for anything
 * we haven't mapped yet.
 */
export const AVG_JOB_VALUE_BY_VERTICAL: Record<string, number> = {
  // Trades — single-callout jobs
  electrician: 600,
  plumber: 650,
  roofing_contractor: 4500,
  hvac_contractor: 900,
  painter: 3200,
  general_contractor: 8000,
  carpenter: 2800,
  landscaper: 2400,
  // Services — recurring or higher-touch
  lawyer: 2000,
  accounting: 1500,
  dentist: 450,
  doctor: 180,
  physiotherapist: 150,
  beauty_salon: 120,
  hair_care: 80,
  gym: 1400, // annual membership
  // Retail / hospitality — low single ticket
  cafe: 15,
  restaurant: 60,
  bakery: 20,
  // Fallback when we can't map the Place type
  default: 800,
};

/** Estimated monthly organic search visitors for an average local service
 *  business. Used by revenue-impact as the pool that a failing site converts
 *  poorly from. Conservative. */
export const ASSUMED_MONTHLY_ORGANIC_VISITORS = 400;

/** Industry-typical contact-form / call conversion rate for a well-built
 *  local service site. Used as the "what you could be getting" baseline. */
export const ASSUMED_CONVERSION_RATE = 0.025; // 2.5%
