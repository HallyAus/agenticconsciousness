import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message, recommendedService } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 });
    }

    // Log the contact for now (integrate with email service later)
    console.log(JSON.stringify({
      event: 'contact_submission',
      name,
      email,
      phone: phone || null,
      recommendedService: recommendedService || null,
      message: message?.slice(0, 200),
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact error:', error);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
