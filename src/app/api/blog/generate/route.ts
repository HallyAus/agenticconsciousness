import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/parseAiJson';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
      { status: 429 }
    );
  }

  const authKey = req.headers.get('Authorization');
  if (authKey !== `Bearer ${process.env.BLOG_ADMIN_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { topic } = await req.json();
    if (!topic) {
      return NextResponse.json({ error: 'Topic required' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `You are the content writer for Agentic Consciousness, an Australian AI consulting company.

Write a blog post about the given topic. The article should:
- Be 800-1200 words
- Target Australian businesses (SMBs to enterprise)
- Include practical, actionable advice — not just theory
- Reference specific AI tools where relevant (ChatGPT, Claude, Copilot, etc.)
- Use Australian English spelling
- Include a clear call-to-action at the end directing readers to book a free consultation
- Be SEO-optimised for the given topic
- Use markdown formatting with ## headings (not #, to leave room for the h1 title)

Respond in valid JSON only, no markdown wrapping:
{
  "title": "SEO-optimised title (50-60 chars)",
  "description": "Meta description (150-160 chars)",
  "content": "Full article in markdown",
  "tags": ["tag1", "tag2", "tag3"]
}`,
      messages: [
        { role: 'user', content: `Write a blog post about: ${topic}` },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let parsed;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed = parseAiJson<any>(text);
    } catch {
      console.error('Failed to parse blog generation response');
      return NextResponse.json({ error: 'Generation failed — invalid response' }, { status: 500 });
    }
    const slug = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug || slug.includes('..') || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Invalid generated slug' }, { status: 400 });
    }

    const post = {
      slug,
      title: parsed.title,
      description: parsed.description,
      content: parsed.content,
      author: 'Agentic Consciousness AI',
      publishedAt: new Date().toISOString(),
      tags: parsed.tags,
      generatedBy: 'claude-sonnet-4-20250514',
    };

    const blogDir = path.join(process.cwd(), 'content', 'blog');
    if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });
    fs.writeFileSync(
      path.join(blogDir, `${slug}.json`),
      JSON.stringify(post, null, 2)
    );

    return NextResponse.json(post);
  } catch (error) {
    console.error('Blog generation error:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
