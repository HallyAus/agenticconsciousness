import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { saveProposal } from '@/lib/proposals';
import { randomUUID } from 'crypto';
import { parseAiJson } from '@/lib/parseAiJson';
import { STANDARD_MODEL } from '@/lib/models';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const authKey = req.headers.get('Authorization');
  if (authKey !== `Bearer ${process.env.PROPOSAL_ADMIN_KEY || process.env.BLOG_ADMIN_KEY}`) {
    // Also allow from internal API calls (no auth for proposal generation from audit)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed, retryAfter } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: `Rate limit exceeded. Try again in ${retryAfter}s.` }, { status: 429 });
    }
  }

  try {
    const { clientName, clientEmail, clientCompany, industry, challenge, service, estimatedValue } = await req.json();

    if (!clientName || !clientEmail || !clientCompany || !service) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: STANDARD_MODEL,
      max_tokens: 2000,
      system: [{
        type: 'text',
        cache_control: { type: 'ephemeral' },
        text: `You are the proposal writer for Agentic Consciousness, an Australian AI consulting company.

Generate a professional proposal. Service: ${service}
- "Strategy & Workshops" = AI strategy sessions, opportunity mapping, team training. Typically 1-2 weeks, $3,000-$8,000.
- "Tool Implementation" = Deploy ChatGPT/Claude/Copilot into workflow, configure, train team. Typically 2-4 weeks, $5,000-$15,000.
- "Automation & Agents" = Build custom AI pipelines, autonomous workflows, integrations. Typically 4-8 weeks, $10,000-$30,000.

${estimatedValue ? `Calibrate line items to approximately ${estimatedValue}.` : 'Use typical range for the service.'}

Respond in valid JSON only:
{
  "title": "Proposal title",
  "summary": "2-3 sentence executive summary",
  "scopeOfWork": "Detailed scope in markdown",
  "deliverables": ["Deliverable 1", ...],
  "timeline": "Timeline description",
  "lineItems": [{ "description": "string", "amount": number }],
  "terms": ["Term 1", ...]
}

Rules:
- All amounts in AUD, no GST in line items (added separately)
- 3-6 specific line items
- Terms: payment schedule, IP ownership, confidentiality, cancellation
- Australian English spelling`,
      }],
      messages: [
        { role: 'user', content: `Client: ${clientName} at ${clientCompany} (${industry}). Challenge: ${challenge || 'General AI consulting'}` },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const cacheRead = response.usage.cache_read_input_tokens ?? 0;
    const cacheWrite = response.usage.cache_creation_input_tokens ?? 0;
    const isHit = cacheRead > 0;
    console.log(
      `[CACHE${isHit ? ' HIT' : ''}] model=${STANDARD_MODEL} input=${response.usage.input_tokens} cache_write=${cacheWrite} cache_read=${cacheRead} output=${response.usage.output_tokens}${isHit ? ' savings=~90%' : ''}`
    );

    let parsed;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { parsed = parseAiJson<any>(text); } catch (parseErr) {
      console.error('Failed to parse proposal generation response:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', text);
      return NextResponse.json({ error: 'Failed to generate proposal' }, { status: 500 });
    }

    const subtotal = parsed.lineItems.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
    const gst = Math.round(subtotal * 0.1);
    const total = subtotal + gst;

    const id = randomUUID();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const proposal = {
      id,
      clientName,
      clientEmail,
      clientCompany,
      industry,
      ...parsed,
      subtotal,
      gst,
      total,
      validUntil,
      status: 'sent' as const,
      createdAt: new Date().toISOString(),
    };

    await saveProposal(proposal);

    console.log(JSON.stringify({ event: 'proposal_generated', id, client: clientCompany, total, timestamp: new Date().toISOString() }));

    return NextResponse.json({ id, url: `/proposal/${id}` });
  } catch (error) {
    console.error('Proposal generation error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
