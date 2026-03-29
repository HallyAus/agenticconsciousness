import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkToolAccess } from '@/lib/toolAccess';
import { validateCsrf } from '@/lib/csrf';
import { incrementToolStat } from '@/lib/toolStats';
import { parseAiJson } from '@/lib/parseAiJson';
import { FAST_MODEL } from '@/lib/models';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const access = checkToolAccess(req, 'summarise');
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

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { text, length } = body as {
      text?: string;
      length?: string;
    };

    const validLengths = ['brief', 'standard', 'detailed'];
    const normalizedLength = (length || '').toLowerCase();

    if (!text || text.length < 10 || text.length > 10000) {
      return NextResponse.json(
        { error: 'Text must be between 10 and 10,000 characters.' },
        { status: 400 }
      );
    }

    if (!normalizedLength || !validLengths.includes(normalizedLength)) {
      return NextResponse.json(
        { error: 'Length must be one of: brief, standard, detailed.' },
        { status: 400 }
      );
    }

    const maxTokensMap: Record<string, number> = {
      brief: 300,
      standard: 600,
      detailed: 800,
    };

    const systemPrompt = `You are a precise summarisation AI. Summarise the provided text according to the requested length. Use Australian English spelling.

Return valid JSON only — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "executiveSummary": "string or null — null for brief, 1-2 sentence summary for standard and detailed",
  "keyPoints": ["string", "..."],
  "wordCount": {
    "original": number,
    "summary": number
  },
  "compressionRatio": "string — e.g. '75% reduction'"
}

Rules:
- brief: 3-5 key points, no executiveSummary (set to null)
- standard: executive summary + 5-8 key points
- detailed: executive summary + 8-12 key points with more context
- Key points should be complete, meaningful sentences
- Australian English spelling throughout`;

    const userMessage = `Length: ${normalizedLength}\n\nText to summarise:\n${text}`;

    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: maxTokensMap[normalizedLength],
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      JSON.stringify({
        tool: 'summarise',
        usage: response.usage,
        stop_reason: response.stop_reason,
        timestamp: new Date().toISOString(),
      })
    );

    let result;
    try {
      result = parseAiJson(rawText);
      incrementToolStat('summaries');
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', rawText);
      return NextResponse.json({ error: 'Invalid response format. Please try again.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Summarise API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Summarisation failed. Please try again.' }, { status: 500 });
  }
}
