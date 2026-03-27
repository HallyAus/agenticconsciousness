import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateCsrf } from '@/lib/csrf';
import { incrementToolStat } from '@/lib/toolStats';
import { parseAiJson } from '@/lib/parseAiJson';
import { STANDARD_MODEL } from '@/lib/models';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip'))?.trim() || 'unknown';
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter}s.` },
      { status: 429 }
    );
  }

  const csrfValid = await validateCsrf(req);
  if (!csrfValid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { jobTitle, company, industry, description, employmentType } = body as {
      jobTitle?: string;
      company?: string;
      industry?: string;
      description?: string;
      employmentType?: string;
    };

    if (!jobTitle || jobTitle.trim().length === 0) {
      return NextResponse.json({ error: 'Job title is required.' }, { status: 400 });
    }

    if (!description || description.length < 10 || description.length > 3000) {
      return NextResponse.json(
        { error: 'Description must be between 10 and 3,000 characters.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert recruitment copywriter for Australian businesses. Write a compelling, inclusive job advertisement based on the provided details. Use Australian English spelling.

Return valid JSON only — no markdown, no backticks, no explanation.

Return exactly this structure:
{
  "title": "string — formatted job title",
  "company": "string — company name",
  "location": "string — location if mentioned, otherwise 'Australia'",
  "type": "string — employment type",
  "salary": "string or null — salary range if mentioned",
  "about": "string — 2-3 sentences about the company/role opportunity",
  "overview": "string — 2-3 sentences describing the role",
  "responsibilities": ["string", "..."],
  "requirements": {
    "essential": ["string", "..."],
    "desirable": ["string", "..."]
  },
  "benefits": ["string", "..."],
  "howToApply": "string — application instructions",
  "biasCheck": "string — notes on any bias-related improvements made"
}

Rules:
- Gender-neutral language throughout (use 'they/them', avoid 'he/she', 'guys', etc.)
- Do not include years-of-experience requirements (e.g., '5+ years')
- Focus on skills, capabilities, and outcomes instead
- Welcoming and inclusive tone
- Australian English spelling throughout
- Realistic and honest — do not over-promise`;

    const userMessage = `Job Title: ${jobTitle}
Company: ${company || 'Not specified'}
Industry: ${industry || 'Not specified'}
Employment Type: ${employmentType || 'Not specified'}

Description:
${description}`;

    const response = await client.messages.create({
      model: STANDARD_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log(
      JSON.stringify({
        tool: 'jobad',
        usage: response.usage,
        timestamp: new Date().toISOString(),
      })
    );

    let result;
    try {
      result = parseAiJson(rawText);
      incrementToolStat('jobads');
    } catch (parseErr) {
      console.error('Failed to parse AI response:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', rawText);
      return NextResponse.json({ error: 'Invalid response format. Please try again.' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Job ad API error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Job ad generation failed. Please try again.' }, { status: 500 });
  }
}
