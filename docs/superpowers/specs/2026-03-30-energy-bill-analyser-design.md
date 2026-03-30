# Energy Bill Analyser — Design Spec

> Upload your power bill. AI extracts usage, compares 200+ plans via AER CDR API, and recommends the cheapest option.

## Date: 2026-03-30

## Overview

Tool #9 for the /tools page. Users upload an electricity bill (photo or PDF). Claude extracts all billing data, then the server queries the AER CDR API to fetch available plans for their area, calculates annual costs based on actual usage, and Claude generates a personalised recommendation.

## Scope

- Electricity only (gas later)
- All AER-covered states: NSW, VIC, QLD, SA, TAS, ACT
- WA/NT: "not available" message with consultation CTA
- Upload only (no manual entry) — same UX pattern as Invoice Scanner

## Two-Phase Flow

### Phase 1 — Bill Extraction (Claude Haiku)

User uploads bill (image or PDF). Claude Haiku extracts structured data (structured extraction is Haiku's strength — save Sonnet for recommendation):

```json
{
  "retailer": "Origin Energy",
  "planName": "Origin Go",
  "postcode": "2000",
  "state": "NSW",
  "distributionZone": "Ausgrid",
  "isEstimatedRead": false,
  "billingPeriod": { "from": "2026-01-01", "to": "2026-03-01", "days": 60 },
  "meters": [
    {
      "nmi": "string or null",
      "meterType": "GENERAL",
      "tariffType": "time-of-use",
      "usage": {
        "totalKwh": 1200,
        "peakKwh": 400,
        "offPeakKwh": 600,
        "shoulderKwh": 200
      },
      "rates": {
        "dailySupplyCharge": 1.20,
        "peakRate": 0.38,
        "offPeakRate": 0.18,
        "shoulderRate": 0.25
      }
    },
    {
      "nmi": "string or null",
      "meterType": "CONTROLLED_LOAD",
      "tariffType": "single",
      "usage": { "totalKwh": 300 },
      "rates": { "dailySupplyCharge": 0, "generalRate": 0.15 }
    }
  ],
  "solar": {
    "exportedKwh": 450,
    "feedInRate": 0.05
  },
  "totalCost": 520.40,
  "averageDailyCost": 8.67,
  "gstIncluded": true
}
```

Extraction rules:
- Use null for any field not found on the bill
- Normalise all rates to $/kWh GST-inclusive (some bills show c/kWh — multiply by 0.01)
- All rates on AU residential bills are GST-inclusive. Set `gstIncluded: true`.
- Detect tariff type per meter: single rate, time-of-use, demand, controlled load
- Detect multiple meters/NMIs — common in NSW/QLD with controlled load (hot water)
- Detect estimated reads — look for "ESTIMATED", "E", or "Est" markers. Set `isEstimatedRead: true`.
- Detect solar: feed-in tariff, exported kWh
- Extract postcode — critical for plan matching
- If postcode not found, attempt to infer from retailer + distribution zone
- Do NOT extract account numbers — privacy risk. Do NOT log bill image data.
- **meterType values:** GENERAL (main supply), CONTROLLED_LOAD (hot water/slab heating), DEMAND (demand tariff meter)

### Phase 2 — Plan Comparison (Server + Claude Sonnet)

1. Use extracted postcode to determine distribution zone
2. Fetch available plans from AER CDR API (filtered by zone, electricity, residential)
3. **GST handling:** AER CDR API returns rates EXCLUSIVE of GST. Multiply all API rates by 1.1 before comparison (bill rates are GST-inclusive).
4. Calculate estimated annual cost for each plan using extracted usage, summing across all meters:
   - Single rate: `(dailySupply * 365) + (totalKwh * annualisedRate)`
   - TOU: `(dailySupply * 365) + (peakKwh * peakRate + offPeakKwh * offPeakRate + shoulderKwh * shoulderRate) * (365 / billingDays)`
   - Controlled load: separate calculation per meter at controlled load rates
   - Demand tariff: **excluded from v1** — show message "Demand tariff plans excluded from comparison"
   - Include solar feed-in credit where applicable (note: tiered feed-in rates simplified to single rate in v1, flagged as "Feed-in rate may vary")
5. Rank plans by annual cost (lowest first)
6. Take top 10 plans + extracted bill data → Claude Sonnet generates personalised recommendation
7. If `isEstimatedRead: true`, add warning: "This bill contains estimated readings. Actual savings may differ."

### Output Schema

```json
{
  "extracted": { /* Phase 1 data */ },
  "currentAnnualEstimate": 3122.40,
  "plans": [
    {
      "rank": 1,
      "retailer": "Alinta Energy",
      "planName": "No Worries Plan",
      "planId": "ALI12345",
      "annualEstimate": 2640.00,
      "annualSavings": 482.40,
      "dailySupplyCharge": 0.99,
      "usageRate": 0.28,
      "solarFeedIn": 0.07,
      "contractType": "No lock-in",
      "exitFees": null,
      "greenPower": false
    }
  ],
  "recommendation": "Based on your usage pattern, you consume most power off-peak (50% of total). Switching to Alinta's No Worries Plan would save you approximately $482 per year...",
  "unsupported": false,
  "unsupportedMessage": null
}
```

## AER CDR API Integration

### Retailer Discovery

Source: `https://jxeeno.github.io/energy-cdr-prd-endpoints/energy-prd-endpoints.json`

This is a community-maintained JSON file mapping retailer codes to their CDR API endpoint URLs. Cache locally and refresh daily.

**Fallback:** Ship a bundled copy at `src/data/energy-cdr-endpoints-fallback.json` in the repo. On fetch failure, fall back to the bundled copy. Include `lastUpdated` in cache so the UI can show "Plan data last updated: X".

### Fetching Plans

For each retailer:
```
GET https://cdr.energymadeeasy.gov.au/<retailer-code>/cds-au/v1/energy/plans
Headers: x-v: 3
Params: page-size=1000
```

For plan detail (tariff breakdown):
```
GET https://cdr.energymadeeasy.gov.au/<retailer-code>/cds-au/v1/energy/plans/{planId}
Headers: x-v: 3
```

### Caching Strategy

Plan data doesn't change frequently. Cache in a separate SQLite database `/app/data/energy-cache.db` (separate from rate limiting DB — different lifecycle and cleanup needs):

```sql
CREATE TABLE IF NOT EXISTS energy_plans_cache (
  retailer_code TEXT NOT NULL,
  plan_data TEXT NOT NULL,  -- JSON blob
  fetched_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (retailer_code)
);
```

- Cache TTL: 24 hours
- On cache miss or stale: fetch from API, store in SQLite
- Fetch plans lazily (only for retailers serving the user's distribution zone, not all retailers)

### Distribution Zone Mapping

Map individual postcodes to distribution zones. Use a proper lookup table (not ranges — postcode ranges don't map cleanly to zones).

```typescript
// src/lib/energyZones.ts
// Sourced from AEMO postcode-to-DNSP mapping CSV
const POSTCODE_TO_ZONE: Record<string, string> = {
  '2000': 'AUSGRID',
  '2001': 'AUSGRID',
  '2250': 'ENDEAVOUR',
  '2251': 'ENDEAVOUR',
  '2350': 'ESSENTIAL',
  // ... individual postcodes for all states
};
```

Source the mapping from AEMO's published postcode-to-DNSP CSV. This is a one-time data import (~2500 postcodes). The mapping is stable (distribution network boundaries rarely change).

### Pagination

Handle CDR API pagination. Check for `links.next` in each response and follow until exhausted. Safety limit: max 5 pages per retailer to prevent infinite loops from malformed responses.

### Filtering Plans

From the API response, filter to:
- `fuelType: 'ELECTRICITY'`
- `customerType: 'RESIDENTIAL'`
- `geography` matches user's distribution zone
- `planType` not `'CONTINGENT'` (excludes plans requiring specific conditions)
- Only `GENERALLY_AVAILABLE` or `NEGOTIABLE` plans

### Annual Cost Calculation

```typescript
const GST_MULTIPLIER = 1.1; // CDR API rates are ex-GST, bills are inc-GST

function calculateAnnualCost(plan: Plan, meters: ExtractedMeter[], solar: SolarData | null): number {
  const days = 365;
  let totalCost = 0;

  for (const meter of meters) {
    const annFactor = days / meter.billingPeriodDays;

    // Daily supply charge (apply GST to API rate)
    totalCost += (plan.dailySupplyCharge * GST_MULTIPLIER) * days;

    if (meter.meterType === 'CONTROLLED_LOAD') {
      // Controlled load uses dedicated rate
      const clRate = (plan.controlledLoadRate || plan.generalRate) * GST_MULTIPLIER;
      totalCost += (meter.usage.totalKwh || 0) * annFactor * clRate;
    } else if (meter.tariffType === 'single') {
      totalCost += (meter.usage.totalKwh || 0) * annFactor * plan.generalRate * GST_MULTIPLIER;
    } else if (meter.tariffType === 'time-of-use') {
      totalCost += ((meter.usage.peakKwh || 0) * plan.peakRate
                 + (meter.usage.offPeakKwh || 0) * plan.offPeakRate
                 + (meter.usage.shoulderKwh || 0) * (plan.shoulderRate || plan.peakRate))
                 * GST_MULTIPLIER * annFactor;
    }
    // Demand tariff: excluded from v1
  }

  // Solar credit (feed-in rates are typically ex-GST but no GST applies to solar credits)
  if (solar?.exportedKwh && plan.solarFeedInRate) {
    const annFactor = days / meters[0].billingPeriodDays;
    totalCost -= solar.exportedKwh * annFactor * plan.solarFeedInRate;
  }

  return Math.round(totalCost * 100) / 100;
}
```

**GST note:** All AER CDR API rates are exclusive of GST. Australian residential electricity prices on bills are inclusive of GST. We multiply API rates by 1.1 to make them comparable. Solar feed-in credits do not attract GST.

### Rate Limits

The AER CDR API returns HTTP 429 if rate limits are exceeded. Mitigate by:
- Caching aggressively (24hr TTL)
- Only fetching plans for relevant retailers (not all 30+)
- Adding 100ms delay between retailer requests
- Graceful fallback: if API is down, show extracted bill data only with message "Plan comparison temporarily unavailable"

## API Route

### `POST /api/tools/energy`

**File:** `src/app/api/tools/energy/route.ts`

```
Request:
  - image: { data: base64, mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }
  - pdf: { data: base64 }

Response (200):
  - extracted: BillData
  - currentAnnualEstimate: number
  - plans: RankedPlan[]
  - recommendation: string
  - unsupported: boolean
  - unsupportedMessage: string | null

Response (429):
  - error: string
  - requiresEmail: boolean
  - tier: string
  - remainingUses: number
```

**Flow:**
1. CSRF validation
2. checkToolAccess(req, 'energy')
3. Validate input (image or PDF, size limits)
4. Phase 1: Claude Sonnet extracts bill data
5. Validate extracted postcode → determine state
6. If WA/NT: return extracted data + unsupported message
7. Phase 2: Fetch plans for distribution zone (from cache or API)
8. Calculate annual costs, rank top 10
9. Phase 2b: Claude Sonnet generates recommendation using bill data + top plans
10. Return full response
11. incrementToolStat('energy')

**Models:**
- Phase 1 extraction: Haiku (FAST_MODEL) — structured extraction, ~2000 max_tokens
- Phase 2 recommendation: Sonnet (STANDARD_MODEL) — complex reasoning, ~1000 max_tokens
- Cost: ~$0.01-0.02 per request (60-70% cheaper than using Sonnet for both)

**Privacy:**
- Do NOT extract or return account numbers
- Do NOT log bill image data (base64)
- Only log metadata: tool name, token usage, timestamp, postcode (for debugging)

## Component

### `src/components/tools/EnergyBillTool.tsx`

Client component following same pattern as InvoiceScanner.

**States:**
- `idle` — upload zone visible
- `loading` — staged loading ("Analysing your bill..." → "Comparing plans..." → "Generating recommendation...")
- `result` — three-section display
- `error` — error message with retry

**Result sections:**

1. **Your Bill** — table showing extracted data:
   - Retailer, plan name
   - Billing period, days
   - Usage breakdown (total, peak, off-peak, shoulder)
   - Current rates
   - Solar (if applicable)
   - Total cost, daily average, annual estimate

2. **Top Plans** — ranked table:
   - Rank, retailer, plan name
   - Annual estimate, savings vs current
   - Key rates (supply charge, usage rate)
   - Contract type, exit fees
   - Expandable row for full detail

3. **Our Recommendation** — AI-generated paragraph with specific advice

4. **CTA** — "Want help switching? Book a free consultation →"

**Upload zone:**
- Drag-drop, file picker, camera (mobile)
- Accept: image/jpeg, image/png, image/webp, application/pdf
- Max size: 8MB (PDF), 4MB (image)
- "Try Example" button with a sample bill result

### Sample Bill (Try Example)

Hardcode a realistic sample result for the "Try Example" button:
- Origin Energy, NSW, 2000, TOU tariff
- 1200 kWh over 60 days
- Current annual estimate: ~$3,120
- Top saving: ~$480/year

## New Files

- `src/app/api/tools/energy/route.ts` — API route
- `src/components/tools/EnergyBillTool.tsx` — UI component
- `src/lib/energyPlans.ts` — AER CDR API client, caching, cost calculation, GST handling
- `src/lib/energyZones.ts` — postcode → distribution zone mapping (individual postcodes from AEMO CSV)
- `src/lib/energyCache.ts` — SQLite cache for plan data (separate DB from rate limiting)
- `src/data/energy-cdr-endpoints-fallback.json` — bundled fallback of retailer CDR endpoints

## Modified Files

- `src/components/tools/ToolsShowcase.tsx` — add tool #9 to TOOL_DATA
- `src/components/tools/ToolExpander.tsx` — add dynamic import for EnergyBillTool
- `src/app/tools/page.tsx` — add SEO data for energy tool
- `src/components/StructuredData.tsx` — add SoftwareApplication schema (optional)

## Design Rules

- ZERO border-radius
- Black (#0a0a0a), white, red (#ff3d00)
- Be Vietnam Pro (display), Space Mono (labels)
- 2px red borders as structural elements
- Consistent with existing tool patterns
- Neural brutalist aesthetic

## Unsupported States

WA/NT postcode detected (or postcode not extracted):

> "Energy plan comparison covers NSW, VIC, QLD, SA, TAS, and ACT. For WA and NT, book a free consultation and we'll analyse your bill personally."
> [Book consultation →]

Still show the extracted bill data — the OCR/extraction is valuable on its own.

## Error Handling

- API timeout/failure: show extracted data + "Plan comparison temporarily unavailable. Try again later."
- Bill unreadable: "We couldn't read your bill. Try a clearer photo or PDF."
- No plans found for zone: "No plans found for your area. This may be a data issue — book a consultation for a manual comparison."
- Postcode not extracted: "We couldn't determine your location from the bill. Book a consultation and we'll help."

## Known Limitations (v1)

- **Demand tariffs excluded** from comparison — show message when detected
- **Solar tiered feed-in simplified** to single rate — flag as "Feed-in rate may vary"
- **Gas not supported** — electricity only, gas planned for v2
- **WA/NT not covered** by AER CDR API — show consultation CTA
- **Estimated reads** may produce inaccurate annualisation — show warning when detected
- **Bundled discounts** (dual-fuel, pay-on-time) not factored into comparison
- **Concession/rebate** eligibility not considered

## Testing Plan

1. Upload real NSW electricity bill (TOU) — verify extraction + comparison
2. Upload VIC bill (single rate) — verify different tariff handling
3. Upload bill photo (not PDF) — verify image extraction
4. Upload WA bill — verify unsupported state message
5. "Try Example" shows realistic hardcoded result
6. Rate limiting works (ToolGate gate applies)
7. API cache works (second request for same zone is fast)
8. Solar bill — verify feed-in tariff extraction and credit calculation
9. AER API down — graceful fallback to extraction only
10. Build passes, Docker image builds
