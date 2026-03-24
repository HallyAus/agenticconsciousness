import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send results error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
