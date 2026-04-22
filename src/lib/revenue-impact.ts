/**
 * Per-finding revenue impact estimator.
 *
 * Every critical/high audit finding costs the prospect measurable money.
 * We translate the severity + category combo into a defensible annual
 * dollar range so the findings page reads as revenue at risk, not just
 * a to-do list.
 *
 * Model (intentionally conservative so we're defensible in conversation):
 *   annual_loss_low  = monthly_visitors * conversion_drag_low  * 12 * avg_job_value * severity_multiplier_low
 *   annual_loss_high = monthly_visitors * conversion_drag_high * 12 * avg_job_value * severity_multiplier_high
 *
 * conversion_drag is how much of the baseline conversion a finding of
 * this category/severity plausibly kills. Ranges rather than a point
 * estimate so we land "$X,XXX to $Y,YYY" instead of a single number
 * that invites nitpicking.
 *
 * severity_multiplier trims or expands the drag based on how bad the
 * finding is. Critical hits full drag, high takes 60%, medium and low
 * and legal opt out of dollar attribution (rendered separately).
 */

import {
  AVG_JOB_VALUE_BY_VERTICAL,
  ASSUMED_MONTHLY_ORGANIC_VISITORS,
  ASSUMED_CONVERSION_RATE,
} from '@/config/sprint';

export interface RevenueRange {
  /** Lower bound, rounded to the nearest $100. */
  lowAud: number;
  /** Upper bound, rounded to the nearest $100. */
  highAud: number;
}

/**
 * Plausibility drag ranges by category — what fraction of the baseline
 * conversion a finding in this category can kill when it's serious.
 * Low end of each range is "conservatively annoying", high end is "this
 * alone loses you leads every week".
 */
const CATEGORY_DRAG: Record<string, [number, number]> = {
  conversion: [0.20, 0.45],   // weak hero, no clear CTA, buried phone
  trust:      [0.10, 0.25],   // missing credentials, no testimonials, no ABN
  mobile:     [0.25, 0.55],   // site broken on phones = the majority of traffic
  seo:        [0.15, 0.35],   // no findability = no visitors to convert
  social:     [0.03, 0.08],   // OG tags affect share appearance only
  performance:[0.10, 0.25],   // slow = bounce
  design:     [0.05, 0.15],
  legal:      [0, 0],         // legal risk surfaced separately, no $ attribution
  ai:         [0, 0],         // opportunities priced as upside, not loss
  general:    [0.05, 0.15],
};

/** Severity adjuster applied on top of category drag. */
const SEVERITY_MULTIPLIER: Record<string, [number, number]> = {
  critical: [1.0, 1.0],
  high:     [0.55, 0.70],
  medium:   [0.25, 0.40],
  low:      [0.05, 0.15],
  legal:    [0, 0],
};

/**
 * Map a Google Places primaryType (or type array) to the vertical key
 * in AVG_JOB_VALUE_BY_VERTICAL. Graceful — unknown types fall back to
 * 'default'. Accepts either the primaryType string or the full types
 * array from place_data.
 */
export function resolveVertical(types: string[] | string | null | undefined): keyof typeof AVG_JOB_VALUE_BY_VERTICAL {
  if (!types) return 'default';
  const arr = Array.isArray(types) ? types : [types];
  for (const t of arr) {
    if (t in AVG_JOB_VALUE_BY_VERTICAL) return t as keyof typeof AVG_JOB_VALUE_BY_VERTICAL;
  }
  return 'default';
}

function roundTo100(n: number): number {
  return Math.max(0, Math.round(n / 100) * 100);
}

/** Estimate annual revenue loss attributable to a single finding. */
export function estimateFindingLoss(args: {
  category: string;
  severity: string;
  vertical: keyof typeof AVG_JOB_VALUE_BY_VERTICAL;
}): RevenueRange | null {
  const cat = args.category.toLowerCase();
  const sev = args.severity.toLowerCase();

  const drag = CATEGORY_DRAG[cat] ?? CATEGORY_DRAG.general;
  const mult = SEVERITY_MULTIPLIER[sev];
  if (!mult) return null;
  if (mult[1] === 0 || drag[1] === 0) return null;

  const avgJob = AVG_JOB_VALUE_BY_VERTICAL[args.vertical] ?? AVG_JOB_VALUE_BY_VERTICAL.default;
  const annualLeads = ASSUMED_MONTHLY_ORGANIC_VISITORS * ASSUMED_CONVERSION_RATE * 12;
  const low  = annualLeads * drag[0] * mult[0] * avgJob;
  const high = annualLeads * drag[1] * mult[1] * avgJob;
  return { lowAud: roundTo100(low), highAud: roundTo100(high) };
}

/** Format a RevenueRange as "$X,XXX to $Y,YYY". */
export function formatRevenueRange(r: RevenueRange): string {
  const fmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
  if (r.lowAud === r.highAud) return fmt.format(r.highAud);
  return `${fmt.format(r.lowAud)} to ${fmt.format(r.highAud)}`;
}

/** Roll up the per-finding estimates into an audit-level "total at risk"
 *  range. Only includes findings with a non-null estimate. */
export function estimateAuditTotal(args: {
  issues: Array<{ category: string; severity: string }>;
  vertical: keyof typeof AVG_JOB_VALUE_BY_VERTICAL;
}): RevenueRange | null {
  let low = 0;
  let high = 0;
  let counted = 0;
  for (const issue of args.issues) {
    const est = estimateFindingLoss({ category: issue.category, severity: issue.severity, vertical: args.vertical });
    if (!est) continue;
    low += est.lowAud;
    high += est.highAud;
    counted += 1;
  }
  if (counted === 0) return null;
  // Apply a 0.7 cap on the sum so we don't imply the findings each kill
  // fully-independent slices of revenue — issues overlap in impact.
  return { lowAud: roundTo100(low * 0.7), highAud: roundTo100(high * 0.7) };
}
