import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { incrementToolStat } from '@/lib/toolStats';
import { parseAiJson } from '@/lib/parseAiJson';
import { FAST_MODEL } from '@/lib/models';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter}s.` },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { text, image, pdf } = body as {
      text?: string;
      image?: { data: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' };
      pdf?: { data: string };
    };

    if (!text && !image && !pdf) {
      return NextResponse.json({ error: 'Provide invoice text, image, or PDF.' }, { status: 400 });
    }

    if (text && text.length > 15000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 15,000 characters.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an invoice parsing AI for Australian businesses. Extract all information from the invoice and return it as valid JSON only — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "supplier": {
    "name": "string or null",
    "abn": "string or null",
    "address": "string or null",
    "contact": "string or null"
  },
  "invoice": {
    "number": "string or null",
    "date": "string or null",
    "dueDate": "string or null",
    "paymentTerms": "string or null"
  },
  "lineItems": [
    {
      "description": "string",
      "qty": "string or null",
      "unitPrice": "string or null",
      "amount": "string or null"
    }
  ],
  "totals": {
    "subtotal": "string or null",
    "gst": "string or null",
    "total": "string or null",
    "currency": "AUD"
  },
  "classification": {
    "category": "string — e.g. Office Supplies, Professional Services, Equipment, Travel, Utilities, etc.",
    "type": "Business" or "Personal",
    "taxDeductible": true or false,
    "notes": "string — any relevant notes about the invoice or classification"
  }
}

Rules:
- Extract exactly what is shown; do not invent data
- Use null for any field not found
- For Australian invoices, GST is typically 10%
- Be precise with numbers — include dollar signs and decimals as shown
- Classify conservatively for tax deductible (only mark true if clearly business-related)
- Australian English spelling`;

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
          text: 'Extract all invoice data from this PDF and return as JSON.',
        },
      ];
    } else if (image) {
      userContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mediaType,
            data: image.data,
          },
        },
        {
          type: 'text',
          text: 'Extract all invoice data from this image and return as JSON.',
        },
      ];
    } else {
      userContent = `Extract all invoice data from the following text and return as JSON:\n\n${text}`;
    }

    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      JSON.stringify({
        tool: 'invoice',
        usage: response.usage,
        timestamp: new Date().toISOString(),
      })
    );

    let result;
    try {
      result = parseAiJson(rawText);
      incrementToolStat('invoices');
    } catch {
      console.error('Failed to parse AI response:', rawText.slice(0, 500));
      return NextResponse.json({ error: 'Invalid response format. Please try again.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Invoice API error:', error);
    return NextResponse.json({ error: 'Invoice scanning failed. Please try again.' }, { status: 500 });
  }
}
