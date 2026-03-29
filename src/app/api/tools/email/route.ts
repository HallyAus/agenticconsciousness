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
  const access = checkToolAccess(req, 'email');
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
    const { text, recipient, tone } = body as {
      text?: string;
      recipient?: string;
      tone?: string;
    };

    const validTones = ['professional', 'friendly', 'direct', 'formal'];
    const normalizedTone = (tone || '').toLowerCase();

    if (!text || text.length < 10 || text.length > 3000) {
      return NextResponse.json(
        { error: 'Text must be between 10 and 3,000 characters.' },
        { status: 400 }
      );
    }

    if (!normalizedTone || !validTones.includes(normalizedTone)) {
      return NextResponse.json(
        { error: 'Tone must be one of: professional, friendly, direct, formal.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert email writer for Australian businesses. Write a polished email in the specified tone based on rough input from the user. Use Australian English spelling (colour, organise, etc.).

Return valid JSON only — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "subject": "string — concise email subject line",
  "body": "string — full email body with greeting, paragraphs, and sign-off",
  "wordCount": number,
  "toneNotes": "string — brief note on how the tone was applied"
}

Rules:
- Match the requested tone precisely
- Keep the email concise and purposeful
- Australian English spelling throughout
- Professional sign-off appropriate to the tone
- Do not invent details not in the input`;

    const userMessage = `Tone: ${normalizedTone}${recipient ? `\nRecipient: ${recipient}` : ''}\n\nRough input:\n${text}`;

    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      JSON.stringify({
        tool: 'email',
        usage: response.usage,
        stop_reason: response.stop_reason,
        timestamp: new Date().toISOString(),
      })
    );

    let result;
    try {
      result = parseAiJson(rawText);
      incrementToolStat('emails');
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', rawText);
      return NextResponse.json({ error: 'Invalid response format. Please try again.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Email API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Email generation failed. Please try again.' }, { status: 500 });
  }
}
