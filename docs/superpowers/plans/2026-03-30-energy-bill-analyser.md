# Energy Bill Analyser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tool #9 — upload a power bill, AI extracts usage data, compares 200+ plans via AER CDR API, recommends the cheapest option with personalised advice.

**Architecture:** Two-phase API route (Haiku extracts bill → server fetches/calculates plans → Sonnet generates recommendation). Separate SQLite cache for plan data. Postcode-to-DNSP lookup for distribution zone matching. Same ToolGate wrapper as other tools.

**Tech Stack:** Next.js 15, Anthropic SDK (Haiku + Sonnet), AER CDR API, better-sqlite3, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-30-energy-bill-analyser-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/energyZones.ts` | Create | Postcode → distribution zone lookup |
| `src/lib/energyCache.ts` | Create | SQLite cache DB for plan data |
| `src/lib/energyPlans.ts` | Create | AER CDR API client, plan fetching, cost calculation |
| `src/data/energy-cdr-endpoints-fallback.json` | Create | Bundled fallback of retailer CDR endpoints |
| `src/app/api/tools/energy/route.ts` | Create | API route — extraction + comparison + recommendation |
| `src/components/tools/EnergyBillTool.tsx` | Create | UI component — upload, results, recommendation |
| `src/components/tools/ToolExpander.tsx` | Modify | Add dynamic import for EnergyBillTool |
| `src/components/tools/ToolsShowcase.tsx` | Modify | Add tool #9 to TOOL_DATA array |
| `src/app/tools/page.tsx` | Modify | Add SEO data for energy tool |
| `src/lib/models.ts` | Modify | Add energy route to model assignments comment |

---

### Task 1: Postcode-to-Distribution-Zone Mapping

**Files:**
- Create: `src/lib/energyZones.ts`

This is a pure data file with no external dependencies. Build it first so everything else can use it.

- [ ] **Step 1: Create the zone mapping module**

Create `src/lib/energyZones.ts` with a `Record<string, string>` mapping individual postcodes to their distribution network service provider (DNSP). Source the data from AEMO's published postcode-to-DNSP mapping. Include all postcodes for NSW (Ausgrid, Endeavour, Essential), VIC (CitiPower, Powercor, Jemena, AusNet, United), QLD (Energex, Ergon), SA (SA Power Networks), TAS (TasNetworks), ACT (Evoenergy).

Export two functions:
```typescript
export function getDistributionZone(postcode: string): string | null
export function getState(postcode: string): string | null
export function isSupported(postcode: string): boolean
```

The `getState` function derives state from postcode ranges: 2xxx=NSW, 3xxx=VIC, 4xxx=QLD, 5xxx=SA, 6xxx=WA, 7xxx=TAS, 08xx=NT, 02xx=ACT (overlaps with NSW — use DNSP to disambiguate).

WA (6xxx) and NT (08xx) postcodes should return `null` from `getDistributionZone` and `false` from `isSupported`.

- [ ] **Step 2: Verify module compiles**

Run: `npx tsc --noEmit src/lib/energyZones.ts` or `npm run build`

- [ ] **Step 3: Commit**

```
git add src/lib/energyZones.ts
git commit -m "feat(energy): postcode-to-distribution-zone mapping"
```

---

### Task 2: Energy Plan Cache (SQLite)

**Files:**
- Create: `src/lib/energyCache.ts`

Separate SQLite database from the rate limiting DB. Handles plan data caching with 24hr TTL.

- [ ] **Step 1: Create the cache module**

Create `src/lib/energyCache.ts`. Follow the same pattern as `src/lib/db.ts` — singleton via `globalThis`, WAL mode, busy_timeout. Database path: `/app/data/energy-cache.db` (production) or `data/energy-cache.db` (dev).

Schema:
```sql
CREATE TABLE IF NOT EXISTS energy_plans_cache (
  retailer_code TEXT PRIMARY KEY,
  plan_data TEXT NOT NULL,
  fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS retailer_endpoints (
  data TEXT NOT NULL,
  fetched_at TEXT DEFAULT (datetime('now'))
);
```

Export functions:
```typescript
export function getCachedPlans(retailerCode: string): object[] | null  // null if stale/missing
export function setCachedPlans(retailerCode: string, plans: object[]): void
export function getCachedEndpoints(): object | null
export function setCachedEndpoints(data: object): void
```

Cache TTL: 24 hours. Check `fetched_at` against `datetime('now', '-24 hours')`.

- [ ] **Step 2: Verify module compiles**

Run: `npm run build`

- [ ] **Step 3: Commit**

```
git add src/lib/energyCache.ts
git commit -m "feat(energy): SQLite cache for plan data"
```

---

### Task 3: CDR Endpoint Fallback Data

**Files:**
- Create: `src/data/energy-cdr-endpoints-fallback.json`

- [ ] **Step 1: Fetch and save the current CDR endpoint list**

Fetch `https://jxeeno.github.io/energy-cdr-prd-endpoints/energy-prd-endpoints.json` and save as the fallback file. This is a one-time snapshot — the live version is fetched at runtime, falling back to this file.

- [ ] **Step 2: Commit**

```
git add src/data/energy-cdr-endpoints-fallback.json
git commit -m "feat(energy): bundled CDR endpoint fallback data"
```

---

### Task 4: Energy Plans API Client

**Files:**
- Create: `src/lib/energyPlans.ts`

The core business logic — fetches plans from AER CDR API, calculates annual costs, ranks results.

- [ ] **Step 1: Create the plans module**

Create `src/lib/energyPlans.ts` with:

**Types:**
```typescript
interface ExtractedMeter {
  nmi: string | null;
  meterType: 'GENERAL' | 'CONTROLLED_LOAD' | 'DEMAND';
  tariffType: 'single' | 'time-of-use' | 'demand';
  billingPeriodDays: number;
  usage: {
    totalKwh?: number;
    peakKwh?: number;
    offPeakKwh?: number;
    shoulderKwh?: number;
  };
}

interface SolarData {
  exportedKwh: number;
  feedInRate: number;
}

interface RankedPlan {
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
```

**Functions:**
```typescript
// Fetch retailer endpoint URLs (cached, with fallback)
export async function getRetailerEndpoints(): Promise<Record<string, string>>

// Fetch plans for a distribution zone (cached per retailer)
export async function getPlansForZone(zone: string): Promise<CDRPlan[]>

// Calculate annual cost for a plan given extracted meter data
export function calculateAnnualCost(plan: CDRPlan, meters: ExtractedMeter[], solar: SolarData | null): number

// Compare plans and rank top 10 by savings
export async function comparePlans(
  postcode: string,
  meters: ExtractedMeter[],
  solar: SolarData | null,
  currentAnnualEstimate: number
): Promise<RankedPlan[]>
```

**Key implementation details:**
- `getRetailerEndpoints()`: Fetch from live URL first, fall back to `src/data/energy-cdr-endpoints-fallback.json`. Cache in SQLite via `energyCache.ts`.
- `getPlansForZone()`: Determine which retailers serve the zone. Fetch plans from each (with 100ms delay between requests). Handle pagination (`links.next`, max 5 pages). Filter to electricity, residential, generally available. Cache per retailer.
- `calculateAnnualCost()`: Implement the GST_MULTIPLIER (1.1) formula from the spec. Sum across meters. Handle single rate, TOU, controlled load. Exclude demand tariffs with a flag. Solar credit without GST.
- `comparePlans()`: Call `getPlansForZone()`, calculate cost for each, sort ascending, take top 10, compute savings vs current estimate.

- [ ] **Step 2: Verify module compiles**

Run: `npm run build`

- [ ] **Step 3: Commit**

```
git add src/lib/energyPlans.ts
git commit -m "feat(energy): AER CDR API client with cost calculation"
```

---

### Task 5: API Route

**Files:**
- Create: `src/app/api/tools/energy/route.ts`

- [ ] **Step 1: Create the API route**

Follow the exact pattern of `src/app/api/tools/invoice/route.ts` but with two-phase Claude calls.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/csrf';
import { checkToolAccess } from '@/lib/toolAccess';
import { incrementToolStat } from '@/lib/toolStats';
import { parseAiJson } from '@/lib/parseAiJson';
import { getClient, FAST_MODEL, STANDARD_MODEL } from '@/lib/models';
import { getDistributionZone, getState, isSupported } from '@/lib/energyZones';
import { comparePlans } from '@/lib/energyPlans';
```

**Route flow:**
1. CSRF validation (FIRST — before tool access)
2. `checkToolAccess(req, 'energy')`
3. Validate input (image or PDF, size limits: 4MB image, 8MB PDF)
4. **Phase 1:** Call Haiku with bill image/PDF + extraction system prompt. Parse response with `parseAiJson`.
5. Get postcode from extracted data. Look up state and distribution zone.
6. If WA/NT or unsupported: return `{ extracted, unsupported: true, unsupportedMessage: "..." }`
7. **Phase 2:** Call `comparePlans()` with extracted meter data.
8. Calculate `currentAnnualEstimate` from extracted data.
9. **Phase 2b:** Call Sonnet with extracted data + top 10 plans. Ask for personalised recommendation paragraph.
10. Return full response. `incrementToolStat('energy')`.

**Phase 1 system prompt** (for Haiku):
Tell Claude to extract structured bill data as JSON. Include the full schema from the spec. Emphasise: rates in $/kWh (not c/kWh), detect multiple meters, detect estimated reads, do NOT include account numbers.

**Phase 2b system prompt** (for Sonnet):
Tell Claude it's an energy consultant. Provide the extracted bill data and top 10 plans. Ask for a 2-3 paragraph recommendation in plain Australian English. Must mention specific savings, explain why the top plan is best for their usage pattern, note any caveats (estimated reads, demand tariffs excluded, etc.).

**Privacy:** Log only `{ tool: 'energy', usage: response.usage, postcode, timestamp }`. Never log base64 image data.

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```
git add src/app/api/tools/energy/route.ts
git commit -m "feat(energy): API route with two-phase extraction + comparison"
```

---

### Task 6: UI Component

**Files:**
- Create: `src/components/tools/EnergyBillTool.tsx`

- [ ] **Step 1: Create the component**

Follow the same pattern as `src/components/tools/InvoiceScanner.tsx`. Client component with states: idle, loading, result, error.

**Upload zone:** Same drag-drop/file picker/camera pattern. Accept image/jpeg, image/png, image/webp, application/pdf. Max 4MB image, 8MB PDF. "Try Example" button.

**Loading state:** Use `StagedLoading` component with stages:
1. "Analysing your energy bill..."
2. "Comparing 200+ plans across 30+ retailers..."
3. "Generating personalised recommendation..."

**Result display (3 sections + CTA):**

**Section 1 — YOUR BILL:** Table with extracted data. Mono labels, light values. Show: retailer, plan name, billing period, usage breakdown per meter (if multiple), rates, solar if applicable, total cost, daily average, annual estimate. If `isEstimatedRead`, show warning banner: "This bill contains estimated readings. Actual savings may differ."

**Section 2 — TOP PLANS:** Ranked table/cards. For each: rank (#1-#10), retailer name, plan name, annual estimate (bold), annual savings in red (e.g. "Save $482/yr"), daily supply charge, usage rate, contract type. Expandable for more detail (exit fees, green power, solar feed-in).

**Section 3 — OUR RECOMMENDATION:** AI-generated text in a bordered section with red top border.

**Section 4 — CTA:** "Want help switching? Book a free consultation →" linking to `/#contact`.

**Unsupported state:** If `unsupported: true`, show extracted bill data (Section 1) + message card with consultation CTA instead of Sections 2-3.

**Error state:** "We couldn't read your bill. Try a clearer photo or PDF." with retry button.

**Try Example:** Hardcoded sample result — Origin Energy, NSW 2000, TOU, 1200 kWh/60 days, top saving $482/yr.

**Design rules:** ZERO border-radius. 2px red borders. bg-ac-card for cards. text-text-primary, text-text-dim. font-mono for labels. font-display for headings.

- [ ] **Step 2: Verify build**

Run: `npm run build`

- [ ] **Step 3: Commit**

```
git add src/components/tools/EnergyBillTool.tsx
git commit -m "feat(energy): bill analyser UI component"
```

---

### Task 7: Integration — Wire Into Tools Page

**Files:**
- Modify: `src/components/tools/ToolExpander.tsx` (line 7-15)
- Modify: `src/components/tools/ToolsShowcase.tsx` (TOOL_DATA array)
- Modify: `src/app/tools/page.tsx` (TOOL_SEO_DATA array)
- Modify: `src/lib/models.ts` (comment block)

- [ ] **Step 1: Add dynamic import to ToolExpander**

In `src/components/tools/ToolExpander.tsx`, add to the `toolComponents` record:
```typescript
energy: dynamic(() => import('@/components/tools/EnergyBillTool')),
```

And add to `TOOL_LABELS`:
```typescript
energy: 'TOOL 09 / ENERGY BILL ANALYSER',
```

- [ ] **Step 2: Add to ToolsShowcase TOOL_DATA**

In `src/components/tools/ToolsShowcase.tsx`, add as the 9th entry in TOOL_DATA:
```typescript
{
  id: 'energy', number: '09', name: 'Energy Bill Analyser',
  headline: 'Find a cheaper energy plan in 30 seconds',
  description: 'Upload your electricity bill. AI extracts your usage, compares 200+ plans across 30+ retailers via the government Energy Made Easy database, and tells you exactly how much you could save. Covers NSW, VIC, QLD, SA, TAS, and ACT.',
  sampleOutput: [
    { key: 'Current Plan', value: 'Origin Go (TOU)' },
    { key: 'Annual Cost', value: '$3,122' },
    { key: 'Best Plan', value: 'Alinta No Worries' },
    { key: 'Annual Saving', value: '$482/yr' },
    { key: 'Contract', value: 'No lock-in' },
  ],
},
```

- [ ] **Step 3: Add SEO data to tools page**

In `src/app/tools/page.tsx`, add to `TOOL_SEO_DATA`:
```typescript
{ id: 'energy', name: 'Energy Bill Analyser', description: 'Upload your electricity bill. AI compares 200+ plans across 30+ retailers and recommends the cheapest option for your usage pattern. Covers NSW, VIC, QLD, SA, TAS, and ACT.' },
```

Update the page metadata title and description to mention 9 tools instead of 8.

- [ ] **Step 4: Update model assignments comment**

In `src/lib/models.ts`, add to the FAST comment block:
```
 *   - energy bill extraction (structured extraction)
```
And to the STANDARD comment block:
```
 *   - energy bill recommendation (personalised analysis)
```

- [ ] **Step 5: Verify build**

Run: `npm run build`

- [ ] **Step 6: Commit**

```
git add src/components/tools/ToolExpander.tsx src/components/tools/ToolsShowcase.tsx src/app/tools/page.tsx src/lib/models.ts
git commit -m "feat(energy): wire energy tool into tools page as tool #9"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean build with no errors.

- [ ] **Step 2: Verify all tool routes still work**

Check that the 8 existing tool routes haven't been broken by any shared module changes.

- [ ] **Step 3: Commit everything and push**

```
git push origin master
```

- [ ] **Step 4: Deploy**

On server:
```bash
cd /opt/agenticconsciousness
git pull
docker compose up -d --build web
```

---

## Execution Notes

- Tasks 1-3 are independent and can be parallelised.
- Task 4 depends on Tasks 1-3.
- Task 5 depends on Task 4.
- Task 6 is independent of Tasks 4-5 (can be built in parallel with hardcoded sample data).
- Task 7 depends on Tasks 5-6.
- Task 8 depends on all previous tasks.

## Post-Deploy Checklist

- [ ] Verify energy tool appears on /tools page
- [ ] Test "Try Example" shows sample result
- [ ] Test upload with a real electricity bill
- [ ] Verify WA postcode shows unsupported message
- [ ] Verify rate limiting applies (ToolGate)
- [ ] Check server logs for any errors
- [ ] Monitor AER CDR API response times
