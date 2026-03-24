import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message, recommendedService } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const submission = {
      timestamp: new Date().toISOString(),
      name,
      email,
      phone: phone || null,
      recommendedService: recommendedService || null,
      message: message || null,
    };

    // Log to console (visible in docker logs)
    console.log('\n========== NEW LEAD ==========');
    console.log(JSON.stringify(submission, null, 2));
    console.log('==============================\n');

    // Also append to a leads file for persistence
    const leadsDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(leadsDir)) fs.mkdirSync(leadsDir, { recursive: true });

    const leadsFile = path.join(leadsDir, 'leads.jsonl');
    fs.appendFileSync(leadsFile, JSON.stringify(submission) + '\n');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact error:', error);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
