/**
 * AER CDR API client — fetches energy plans, calculates annual costs, ranks results.
 *
 * Uses the Consumer Data Right (CDR) API to query Australian energy retailers
 * for publicly available residential electricity plans, then estimates annual
 * cost based on a customer's extracted bill data.
 */

import { getDistributionZone } from './energyZones';
import {
  getCachedPlans,
  setCachedPlans,
  getCachedEndpoints,
  setCachedEndpoints,
} from './energyCache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedMeter {
  nmi: string | null;
  meterType: 'GENERAL' | 'CONTROLLED_LOAD' | 'DEMAND';
  tariffType: 'single' | 'time-of-use' | 'demand';
  usage: {
    totalKwh?: number;
    peakKwh?: number;
    offPeakKwh?: number;
    shoulderKwh?: number;
  };
  rates: {
    dailySupplyCharge?: number;
    generalRate?: number;
    peakRate?: number;
    offPeakRate?: number;
    shoulderRate?: number;
  };
}

export interface SolarData {
  exportedKwh: number;
  feedInRate: number;
}

export interface BillData {
  retailer: string | null;
  planName: string | null;
  postcode: string | null;
  state: string | null;
  distributionZone: string | null;
  isEstimatedRead: boolean;
  billingPeriod: { from: string | null; to: string | null; days: number };
  meters: ExtractedMeter[];
  solar: SolarData | null;
  totalCost: number | null;
  averageDailyCost: number | null;
  gstIncluded: boolean;
}

export interface RankedPlan {
  rank: number;
  retailer: string;
  planName: string;
  planId: string;
  annualEstimate: number;
  annualSavings: number;
  dailySupplyCharge: number;
  usageRate: number;
  solarFeedIn: number | null;
  contractType: string;
  exitFees: string | null;
  greenPower: boolean;
}

// ---------------------------------------------------------------------------
// CDR API response shapes (simplified)
// ---------------------------------------------------------------------------

interface CDRPlanGeography {
  excludedPostcodes?: string[];
  includedPostcodes?: string[];
  distributors?: string[];
}

interface CDRRate {
  unitPrice: number;
  measureUnit?: string;
  volume?: number;
}

interface CDRDailySupplyCharge {
  amount: number;
}

interface CDRTariffPeriod {
  displayName?: string;
  type?: string;
  rateBlockUType?: string;
  singleRate?: { rates: CDRRate[]; dailySupplyCharge?: number };
  timeOfUseRates?: Array<{
    type: string;
    rates: CDRRate[];
  }>;
  demandCharges?: unknown[];
  dailySupplyCharges?: CDRDailySupplyCharge[];
  rates?: CDRRate[];
}

interface CDRElectricityContract {
  tariffPeriod: CDRTariffPeriod[];
  pricingModel?: string;
  isFixed?: boolean;
  paymentOption?: string[];
  intrinsicGreenPower?: { greenPercentage: number };
  controlledLoad?: Array<{
    displayName?: string;
    rateBlockUType?: string;
    singleRate?: { rates: CDRRate[]; dailySupplyCharge?: number };
    rates?: CDRRate[];
    dailySupplyCharge?: number;
  }>;
  solarFeedInTariff?: Array<{
    displayName?: string;
    scheme: string;
    payerType: string;
    tariffUType: string;
    singleTariff?: { amount: number };
    timeVaryingTariffs?: unknown[];
  }>;
}

interface CDRPlanDetail {
  electricityContract?: CDRElectricityContract;
}

export interface CDRPlan {
  planId: string;
  displayName?: string;
  description?: string;
  type?: string;
  fuelType: string;
  customerType?: string;
  brand?: string;
  brandName?: string;
  geography?: CDRPlanGeography;
  planDetail?: CDRPlanDetail;
  effectiveFrom?: string;
  effectiveTo?: string;
  lastUpdated?: string;
  additionalInformation?: {
    overviewUri?: string;
    termsUri?: string;
    eligibilityUri?: string;
    pricingUri?: string;
    bundleUri?: string;
  };
  contract?: {
    variation?: string;
    description?: string;
    exitFee?: { amount: number; type: string };
  };
}

interface CDREndpointEntry {
  brandName?: string;
  dataHolderBrandName?: string;
  publicBaseUri: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GST_MULTIPLIER = 1.1;
const ENDPOINTS_URL =
  'https://jxeeno.github.io/energy-cdr-prd-endpoints/energy-prd-endpoints.json';
const MAX_PAGES = 5;
const RETAILER_DELAY_MS = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitiseRetailerCode(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// ---------------------------------------------------------------------------
// getRetailerEndpoints
// ---------------------------------------------------------------------------

export async function getRetailerEndpoints(): Promise<Record<string, string>> {
  // 1. Check cache
  const cached = (await getCachedEndpoints()) as Record<string, string> | null;
  if (cached && Object.keys(cached).length > 0) {
    return cached;
  }

  // 2. Fetch live
  let entries: CDREndpointEntry[] = [];
  try {
    const res = await fetch(ENDPOINTS_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    entries = Array.isArray(json) ? json : json?.data ?? [];
  } catch (err) {
    console.warn('[energyPlans] Live endpoint fetch failed, using fallback:', err);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fallback = require('@/data/energy-cdr-endpoints-fallback.json');
      entries = Array.isArray(fallback) ? fallback : fallback?.data ?? [];
    } catch {
      console.error('[energyPlans] Fallback endpoint load also failed');
      return {};
    }
  }

  // 3. Build map
  const map: Record<string, string> = {};
  for (const entry of entries) {
    const name = entry.brandName ?? entry.dataHolderBrandName;
    if (name && entry.publicBaseUri) {
      map[name] = entry.publicBaseUri;
    }
  }

  // 4. Cache
  await setCachedEndpoints(map);
  return map;
}

// ---------------------------------------------------------------------------
// getPlansForZone
// ---------------------------------------------------------------------------

export async function getPlansForZone(zone: string): Promise<CDRPlan[]> {
  const endpoints = await getRetailerEndpoints();
  const allPlans: CDRPlan[] = [];

  for (const [retailerName, baseUri] of Object.entries(endpoints)) {
    const retailerCode = sanitiseRetailerCode(retailerName);

    // Check cache first
    const cached = await getCachedPlans(retailerCode);
    if (cached) {
      const typed = cached as CDRPlan[];
      const filtered = filterPlansForZone(typed, zone);
      allPlans.push(...filtered);
      continue;
    }

    // Fetch from CDR API
    try {
      const plans = await fetchRetailerPlans(baseUri, retailerName);
      await setCachedPlans(retailerCode, plans);
      const filtered = filterPlansForZone(plans, zone);
      allPlans.push(...filtered);
    } catch (err) {
      console.warn(`[energyPlans] Failed to fetch plans for ${retailerName}:`, err);
    }

    await sleep(RETAILER_DELAY_MS);
  }

  return allPlans;
}

async function fetchRetailerPlans(
  baseUri: string,
  retailerName: string
): Promise<CDRPlan[]> {
  const plans: CDRPlan[] = [];
  let nextUrl: string | null =
    `${baseUri}/cds-au/v1/energy/plans?page-size=1000`;
  let pageCount = 0;

  while (nextUrl && pageCount < MAX_PAGES) {
    const fetchUrl: string = nextUrl;
    const res: Response = await fetch(fetchUrl, {
      headers: { 'x-v': '3' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(
        `[energyPlans] ${retailerName} returned HTTP ${res.status}`
      );
      break;
    }

    const json = await res.json();
    const pagePlans: CDRPlan[] = json?.data?.plans ?? [];

    // Tag each plan with brand info
    for (const plan of pagePlans) {
      plan.brandName = plan.brandName ?? retailerName;
    }

    plans.push(...pagePlans);
    nextUrl = json?.links?.next ?? null;
    pageCount++;
  }

  return plans;
}

function filterPlansForZone(plans: CDRPlan[], zone: string): CDRPlan[] {
  return plans.filter((plan) => {
    // Must be residential electricity
    if (plan.fuelType !== 'ELECTRICITY') return false;
    if (plan.customerType && plan.customerType !== 'RESIDENTIAL') return false;

    // Check geography — if distributors listed, zone must match
    const geo = plan.geography;
    if (geo?.distributors && geo.distributors.length > 0) {
      const zoneUpper = zone.toUpperCase();
      const matches = geo.distributors.some(
        (d) => d.toUpperCase() === zoneUpper
      );
      if (!matches) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// calculateAnnualCost
// ---------------------------------------------------------------------------

interface PlanRates {
  dailySupplyChargeCents: number;
  generalRateCents: number;
  peakRateCents: number;
  offPeakRateCents: number;
  shoulderRateCents: number;
  controlledLoadRateCents: number;
  solarFeedInCents: number;
}

export function calculateAnnualCost(
  planRates: PlanRates,
  meters: ExtractedMeter[],
  billingPeriodDays: number,
  solar: SolarData | null
): number {
  if (billingPeriodDays <= 0) return Infinity;

  const annualFactor = 365 / billingPeriodDays;
  let totalCost = 0;

  for (const meter of meters) {
    // Demand tariffs — too complex, exclude
    if (meter.meterType === 'DEMAND' || meter.tariffType === 'demand') {
      return Infinity;
    }

    // Daily supply charge (cents → dollars, inc GST)
    const dailySupply =
      (planRates.dailySupplyChargeCents / 100) * GST_MULTIPLIER * 365;
    // Only add supply charge once (first meter)
    if (meters.indexOf(meter) === 0) {
      totalCost += dailySupply;
    }

    // Usage cost
    if (meter.meterType === 'CONTROLLED_LOAD') {
      const kwh = (meter.usage.totalKwh ?? 0) * annualFactor;
      totalCost +=
        (planRates.controlledLoadRateCents / 100) * kwh * GST_MULTIPLIER;
    } else if (meter.tariffType === 'time-of-use') {
      const peak = (meter.usage.peakKwh ?? 0) * annualFactor;
      const offPeak = (meter.usage.offPeakKwh ?? 0) * annualFactor;
      const shoulder = (meter.usage.shoulderKwh ?? 0) * annualFactor;

      totalCost +=
        (planRates.peakRateCents / 100) * peak * GST_MULTIPLIER +
        (planRates.offPeakRateCents / 100) * offPeak * GST_MULTIPLIER +
        (planRates.shoulderRateCents / 100) * shoulder * GST_MULTIPLIER;
    } else {
      // Single rate / flat
      const kwh = (meter.usage.totalKwh ?? 0) * annualFactor;
      totalCost += (planRates.generalRateCents / 100) * kwh * GST_MULTIPLIER;
    }
  }

  // Solar credit — feed-in tariff (no GST on credits)
  if (solar && solar.exportedKwh > 0) {
    const annualExport = solar.exportedKwh * annualFactor;
    const credit = (planRates.solarFeedInCents / 100) * annualExport;
    totalCost -= credit;
  }

  return Math.round(totalCost * 100) / 100;
}

// ---------------------------------------------------------------------------
// Rate extraction from CDR plan detail
// ---------------------------------------------------------------------------

function extractPlanRates(plan: CDRPlan): PlanRates | null {
  try {
    const contract = plan.planDetail?.electricityContract;
    if (!contract) return null;

    const tariffPeriods = contract.tariffPeriod ?? [];
    if (tariffPeriods.length === 0) return null;

    let dailySupplyChargeCents = 0;
    let generalRateCents = 0;
    let peakRateCents = 0;
    let offPeakRateCents = 0;
    let shoulderRateCents = 0;

    for (const period of tariffPeriods) {
      // Daily supply charge
      if (period.dailySupplyCharges && period.dailySupplyCharges.length > 0) {
        dailySupplyChargeCents = period.dailySupplyCharges[0].amount;
      }
      if (period.singleRate?.dailySupplyCharge) {
        dailySupplyChargeCents = period.singleRate.dailySupplyCharge;
      }

      // Single rate
      if (period.singleRate?.rates && period.singleRate.rates.length > 0) {
        generalRateCents = period.singleRate.rates[0].unitPrice;
      }

      // Flat rates array
      if (period.rates && period.rates.length > 0) {
        generalRateCents = period.rates[0].unitPrice;
      }

      // Time of use rates
      if (period.timeOfUseRates && period.timeOfUseRates.length > 0) {
        for (const touRate of period.timeOfUseRates) {
          const rate =
            touRate.rates && touRate.rates.length > 0
              ? touRate.rates[0].unitPrice
              : 0;
          const typeUpper = (touRate.type ?? '').toUpperCase();
          if (typeUpper.includes('PEAK') && !typeUpper.includes('OFF')) {
            peakRateCents = rate;
          } else if (typeUpper.includes('OFF')) {
            offPeakRateCents = rate;
          } else if (typeUpper.includes('SHOULDER')) {
            shoulderRateCents = rate;
          } else {
            // Default — treat as general
            if (!generalRateCents) generalRateCents = rate;
          }
        }
      }

      // Demand charges — skip plan
      if (period.demandCharges && (period.demandCharges as unknown[]).length > 0) {
        return null;
      }
    }

    // If no general rate found, fall back to peak as general
    if (!generalRateCents && peakRateCents) {
      generalRateCents = peakRateCents;
    }

    // Must have at least a daily supply or a usage rate
    if (!dailySupplyChargeCents && !generalRateCents && !peakRateCents) {
      return null;
    }

    // Controlled load
    let controlledLoadRateCents = 0;
    if (contract.controlledLoad && contract.controlledLoad.length > 0) {
      const cl = contract.controlledLoad[0];
      if (cl.singleRate?.rates && cl.singleRate.rates.length > 0) {
        controlledLoadRateCents = cl.singleRate.rates[0].unitPrice;
      } else if (cl.rates && cl.rates.length > 0) {
        controlledLoadRateCents = cl.rates[0].unitPrice;
      }
    }

    // Solar feed-in
    let solarFeedInCents = 0;
    if (contract.solarFeedInTariff && contract.solarFeedInTariff.length > 0) {
      const fit = contract.solarFeedInTariff[0];
      if (fit.singleTariff?.amount) {
        solarFeedInCents = fit.singleTariff.amount;
      }
    }

    return {
      dailySupplyChargeCents,
      generalRateCents,
      peakRateCents,
      offPeakRateCents,
      shoulderRateCents,
      controlledLoadRateCents,
      solarFeedInCents,
    };
  } catch (err) {
    console.warn(
      `[energyPlans] Failed to extract rates for plan ${plan.planId}:`,
      err
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// comparePlans
// ---------------------------------------------------------------------------

export async function comparePlans(
  postcode: string,
  meters: ExtractedMeter[],
  billingPeriodDays: number,
  solar: SolarData | null,
  currentAnnualEstimate: number
): Promise<RankedPlan[]> {
  // 1. Get distribution zone
  const zone = getDistributionZone(postcode);
  if (!zone) {
    console.warn(`[energyPlans] No distribution zone for postcode ${postcode}`);
    return [];
  }

  // 2. Fetch plans
  let plans: CDRPlan[];
  try {
    plans = await getPlansForZone(zone);
  } catch (err) {
    console.error('[energyPlans] Failed to fetch plans:', err);
    return [];
  }

  if (plans.length === 0) return [];

  // 3. Calculate cost for each plan
  const scored: Array<{
    plan: CDRPlan;
    rates: PlanRates;
    annual: number;
  }> = [];

  for (const plan of plans) {
    const rates = extractPlanRates(plan);
    if (!rates) continue;

    const annual = calculateAnnualCost(rates, meters, billingPeriodDays, solar);
    if (!isFinite(annual) || annual <= 0) continue;

    scored.push({ plan, rates, annual });
  }

  // 4. Sort ascending by annual cost
  scored.sort((a, b) => a.annual - b.annual);

  // 5. Take top 10
  const top = scored.slice(0, 10);

  // 6. Build ranked results
  return top.map((item, idx) => {
    const contract = item.plan.planDetail?.electricityContract;
    const exitFeeObj = item.plan.contract?.exitFee;

    return {
      rank: idx + 1,
      retailer: item.plan.brandName ?? item.plan.brand ?? 'Unknown',
      planName: item.plan.displayName ?? 'Unnamed Plan',
      planId: item.plan.planId,
      annualEstimate: item.annual,
      annualSavings: Math.round((currentAnnualEstimate - item.annual) * 100) / 100,
      dailySupplyCharge:
        Math.round(
          (item.rates.dailySupplyChargeCents / 100) * GST_MULTIPLIER * 100
        ) / 100,
      usageRate:
        Math.round(
          (item.rates.generalRateCents || item.rates.peakRateCents) * 100
        ) / 100,
      solarFeedIn: item.rates.solarFeedInCents
        ? Math.round(item.rates.solarFeedInCents * 100) / 100
        : null,
      contractType: contract?.isFixed ? 'Fixed' : 'Variable',
      exitFees: exitFeeObj
        ? `$${exitFeeObj.amount} (${exitFeeObj.type})`
        : null,
      greenPower: (contract?.intrinsicGreenPower?.greenPercentage ?? 0) > 0,
    };
  });
}
