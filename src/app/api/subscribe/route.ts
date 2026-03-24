import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.appendFileSync(
      path.join(dataDir, 'subscribers.jsonl'),
      JSON.stringify({ email, subscribedAt: new Date().toISOString() }) + '\n'
    );

    console.log(JSON.stringify({ event: 'new_subscriber', email, timestamp: new Date().toISOString() }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
