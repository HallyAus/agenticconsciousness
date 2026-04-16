import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkToolAccess } from '@/lib/toolAccess';
import { validateCsrf } from '@/lib/csrf';
import { incrementToolStat } from '@/lib/toolStats';
import { parseAiJson } from '@/lib/parseAiJson';
import { FAST_MODEL, STANDARD_MODEL, getClient } from '@/lib/models';
import { BillData, comparePlans } from '@/lib/energyPlans';
import { getState, isSupported } from '@/lib/energyZones';

export async function POST(req: NextRequest) {
  // CSRF validation FIRST (security fix — before tool access)
  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json(
      { error: 'Your session has expired. Refresh the page and try again.' },
      { status: 403 }
    );
  }

  const access = await checkToolAccess(req, 'energy');
  if (access.status === 'email_gate') {
    return NextResponse.json(
      { error: 'Daily limit reached. Verify your email for 20 uses per day.', code: 'email_gate' },
      { status: 402 }
    );
  }
  if (access.status === 'capped') {
    return NextResponse.json(
      { error: 'Daily limit reached. Resets at midnight.', code: 'capped' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { image, pdf } = body as {
      image?: { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' };
      pdf?: { data: string };
    };

    // Must have image or PDF
    if (!image && !pdf) {
      return NextResponse.json(
        { error: 'Upload an electricity bill image or PDF.' },
        { status: 400 }
      );
    }

    // Size limits
    if (image && image.data && image.data.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large. Maximum 4MB.' }, { status: 400 });
    }
    if (pdf && pdf.data && pdf.data.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF too large. Maximum 8MB.' }, { status: 400 });
    }

    // -----------------------------------------------------------------------
    // Phase 1: Extract bill data (Haiku)
    // -----------------------------------------------------------------------

    const phase1System = `You are an Australian electricity bill parser. Extract all data from this electricity bill and return as valid JSON only — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "retailer": "string or null",
  "planName": "string or null",
  "postcode": "string or null",
  "state": "string or null",
  "distributionZone": "string or null",
  "isEstimatedRead": boolean,
  "billingPeriod": { "from": "YYYY-MM-DD or null", "to": "YYYY-MM-DD or null", "days": number },
  "meters": [
    {
      "nmi": "string or null",
      "meterType": "GENERAL" | "CONTROLLED_LOAD" | "DEMAND",
      "tariffType": "single" | "time-of-use" | "demand",
      "usage": {
        "totalKwh": number or null,
        "peakKwh": number or null,
        "offPeakKwh": number or null,
        "shoulderKwh": number or null
      },
      "rates": {
        "dailySupplyCharge": number or null,
        "generalRate": number or null,
        "peakRate": number or null,
        "offPeakRate": number or null,
        "shoulderRate": number or null
      }
    }
  ],
  "solar": { "exportedKwh": number, "feedInRate": number } or null,
  "totalCost": number or null,
  "averageDailyCost": number or null,
  "gstIncluded": true
}

Rules:
- All rates must be in $/kWh GST-inclusive. If shown in c/kWh, divide by 100.
- Detect multiple meters/NMIs (common for controlled load hot water)
- Look for "ESTIMATED", "E", or "Est" markers for isEstimatedRead
- Do NOT include account numbers
- Extract postcode from the address on the bill
- Use null for any field not found`;

    let userContent: Anthropic.MessageParam['content'];

    if (pdf) {
      userContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdf.data,
          },
        },
        {
          type: 'text',
          text: 'Extract all electricity bill data from this PDF and return as JSON.',
        },
      ];
    } else {
      userContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: image!.mediaType,
            data: image!.data,
          },
        },
        {
          type: 'text',
          text: 'Extract all electricity bill data from this image and return as JSON.',
        },
      ];
    }

    const client = getClient();
    const phase1Response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 2000,
      system: phase1System,
      messages: [{ role: 'user', content: userContent }],
    });

    const p1CacheRead = phase1Response.usage.cache_read_input_tokens ?? 0;
    const p1CacheWrite = phase1Response.usage.cache_creation_input_tokens ?? 0;
    const p1Hit = p1CacheRead > 0;
    console.log(
      `[CACHE${p1Hit ? ' HIT' : ''}] model=${FAST_MODEL} input=${phase1Response.usage.input_tokens} cache_write=${p1CacheWrite} cache_read=${p1CacheRead} output=${phase1Response.usage.output_tokens}${p1Hit ? ' savings=~90%' : ''}`
    );

    const phase1Text = phase1Response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let extracted: BillData;
    try {
      extracted = parseAiJson(phase1Text) as BillData;
    } catch (parseErr) {
      console.error('Failed to parse bill extraction:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', phase1Text);
      return NextResponse.json(
        { error: 'Could not read your bill. Try a clearer image or PDF.' },
        { status: 500 }
      );
    }

    // -----------------------------------------------------------------------
    // Check postcode support
    // -----------------------------------------------------------------------

    const postcode = extracted.postcode;
    if (!postcode) {
      // Still return extracted data even without postcode
      console.log(JSON.stringify({
        tool: 'energy',
        usage: phase1Response.usage,
        postcode: null,
        timestamp: new Date().toISOString(),
      }));
      await incrementToolStat('energy');
      return NextResponse.json({
        extracted,
        unsupported: true,
        unsupportedMessage: 'Could not detect a postcode from your bill. Please try a clearer image.',
      });
    }

    if (!isSupported(postcode)) {
      const state = getState(postcode);
      console.log(JSON.stringify({
        tool: 'energy',
        usage: phase1Response.usage,
        postcode: extracted.postcode,
        timestamp: new Date().toISOString(),
      }));
      await incrementToolStat('energy');
      return NextResponse.json({
        extracted,
        unsupported: true,
        unsupportedMessage: `Energy plan comparison is not yet available for ${state ?? 'your state'}. We currently cover NSW, VIC, QLD, SA, TAS, and ACT.`,
      });
    }

    // -----------------------------------------------------------------------
    // Phase 2: Compare plans
    // -----------------------------------------------------------------------

    const billingDays = extracted.billingPeriod?.days || 90;
    const currentAnnualEstimate = extracted.totalCost
      ? Math.round((extracted.totalCost / billingDays) * 365 * 100) / 100
      : 0;

    const rankedPlans = await comparePlans(
      postcode,
      extracted.meters ?? [],
      billingDays,
      extracted.solar ?? null,
      currentAnnualEstimate
    );

    // -----------------------------------------------------------------------
    // Phase 2b: Generate recommendation (Sonnet)
    // -----------------------------------------------------------------------

    let recommendation = '';
    let phase2Response: Anthropic.Message | null = null;

    if (rankedPlans.length > 0) {
      const phase2bSystem = `You are an Australian energy consultant. Given a customer's electricity bill data and the top 10 available plans in their area, write a 2-3 paragraph personalised recommendation in plain Australian English.

Mention: specific annual savings, why the top plan suits their usage pattern (peak/off-peak breakdown, solar if applicable), contract terms, any caveats.

Be direct and practical. No marketing fluff. Use $ amounts.`;

      const phase2bUserMessage = JSON.stringify({
        billData: extracted,
        currentAnnualEstimate,
        topPlans: rankedPlans,
      });

      try {
        phase2Response = await client.messages.create({
          model: STANDARD_MODEL,
          max_tokens: 1000,
          system: [
            {
              type: 'text',
              text: phase2bSystem,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: phase2bUserMessage }],
        });

        const p2CacheRead = phase2Response.usage.cache_read_input_tokens ?? 0;
        const p2CacheWrite = phase2Response.usage.cache_creation_input_tokens ?? 0;
        const p2Hit = p2CacheRead > 0;
        console.log(
          `[CACHE${p2Hit ? ' HIT' : ''}] model=${STANDARD_MODEL} input=${phase2Response.usage.input_tokens} cache_write=${p2CacheWrite} cache_read=${p2CacheRead} output=${phase2Response.usage.output_tokens}${p2Hit ? ' savings=~90%' : ''}`
        );

        recommendation = phase2Response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('');
      } catch (recErr) {
        console.error('Phase 2b recommendation failed:', recErr instanceof Error ? recErr.message : recErr);
        // Non-fatal — continue without recommendation
      }
    }

    // -----------------------------------------------------------------------
    // Privacy logging — never log base64 data
    // -----------------------------------------------------------------------

    console.log(JSON.stringify({
      tool: 'energy',
      usage: phase1Response.usage,
      phase2Usage: phase2Response?.usage,
      postcode: extracted.postcode,
      timestamp: new Date().toISOString(),
    }));

    await incrementToolStat('energy');

    return NextResponse.json({
      extracted,
      currentAnnualEstimate,
      plans: rankedPlans,
      recommendation,
    });
  } catch (error) {
    console.error('Energy API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Energy bill analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
