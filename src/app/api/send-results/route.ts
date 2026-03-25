import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail, emailTemplate } from '@/lib/email';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
      { status: 429 }
    );
  }

  try {
    const { email, toolName, results } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Log the email capture (this is a warm lead!)
    const submission = {
      timestamp: new Date().toISOString(),
      email,
      toolName,
      resultsPreview: typeof results === 'string' ? results.slice(0, 200) : 'structured data',
    };

    console.log('\n========== TOOL EMAIL CAPTURE ==========');
    console.log(JSON.stringify(submission, null, 2));
    console.log('========================================\n');

    // Save to leads file
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.appendFileSync(
      path.join(dataDir, 'leads.jsonl'),
      JSON.stringify({ ...submission, source: 'tool-email', results }) + '\n'
    );

    await sendEmail({
      to: email,
      subject: `Your ${toolName} Results — Agentic Consciousness`,
      html: emailTemplate(`
        <h2 style="color:#fff;font-size:20px;margin:0 0 16px">Your ${toolName} results</h2>
        <pre style="background:#111;padding:16px;border-left:3px solid #ff3d00;color:#ccc;font-size:12px;overflow-x:auto;white-space:pre-wrap">${typeof results === 'string' ? results : JSON.stringify(results, null, 2)}</pre>
        <p style="color:#e0e0e0;margin-top:20px">Try our other free AI tools:</p>
        <a href="https://agenticconsciousness.com.au/tools" style="color:#ff3d00;text-decoration:none;font-weight:bold">agenticconsciousness.com.au/tools →</a>
      `),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send results error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
