import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/parseAiJson';
import { STANDARD_MODEL } from '@/lib/models';

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
      model: STANDARD_MODEL,
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

    const cacheRead = response.usage.cache_read_input_tokens ?? 0;
    const cacheWrite = response.usage.cache_creation_input_tokens ?? 0;
    const isHit = cacheRead > 0;
    console.log(
      `[CACHE${isHit ? ' HIT' : ''}] model=${STANDARD_MODEL} input=${response.usage.input_tokens} cache_write=${cacheWrite} cache_read=${cacheRead} output=${response.usage.output_tokens}${isHit ? ' savings=~90%' : ''}`
    );

    let parsed;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed = parseAiJson<any>(text);
    } catch (parseErr) {
      console.error('Failed to parse blog generation response:', parseErr instanceof Error ? parseErr.message : parseErr);
      console.error('Raw AI text:', text);
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
      generatedBy: STANDARD_MODEL,
    };

    // Commit the generated post to GitHub — Vercel auto-deploys on push
    const githubToken = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // e.g. "HallyAus/agenticconsciousness"
    const branch = process.env.GITHUB_BRANCH || 'master';

    if (!githubToken || !repo) {
      return NextResponse.json(
        { error: 'Blog publishing disabled — GITHUB_TOKEN and GITHUB_REPO required' },
        { status: 503 }
      );
    }

    const [owner, repoName] = repo.split('/');
    const octokit = new Octokit({ auth: githubToken });
    const filePath = `content/blog/${slug}.json`;
    const contentBase64 = Buffer.from(JSON.stringify(post, null, 2)).toString('base64');

    try {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: filePath,
        message: `feat(blog): add ${slug}`,
        content: contentBase64,
        branch,
        committer: { name: 'Agentic Consciousness Bot', email: 'ai@agenticconsciousness.com.au' },
      });
    } catch (err) {
      console.error('[blog] GitHub commit failed:', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Failed to publish blog post' }, { status: 500 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Blog generation error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
