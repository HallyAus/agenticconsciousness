import { NextRequest, NextResponse } from 'next/server';
import { getSubscribers, saveSubscribers, DRIP_SCHEDULE } from '@/lib/drip';

export async function GET(req: NextRequest) {
  const authKey = req.headers.get('Authorization');
  if (authKey !== `Bearer ${process.env.DRIP_ADMIN_KEY || process.env.BLOG_ADMIN_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subscribers = await getSubscribers();
    const now = Date.now();
    let emailsSent = 0;

    for (const sub of subscribers) {
      if (sub.unsubscribed) continue;

      const daysSinceSubscribe = Math.floor((now - new Date(sub.subscribedAt).getTime()) / (1000 * 60 * 60 * 24));

      for (const step of DRIP_SCHEDULE) {
        if (daysSinceSubscribe >= step.day && !sub.emailsSent.includes(step.day)) {
          // Would send email here (via Resend/SMTP when configured)
          // For now, log it
          const subject = step.subject.replace('{industry}', sub.industry);

          console.log(JSON.stringify({
            event: 'drip_email_sent',
            email: sub.email,
            day: step.day,
            subject,
            timestamp: new Date().toISOString(),
          }));

          // Emitted via stdout — captured by Vercel Logs / observability
          sub.emailsSent.push(step.day);
          emailsSent++;
        }
      }
    }

    await saveSubscribers(subscribers);

    return NextResponse.json({ processed: subscribers.length, emailsSent });
  } catch (error) {
    console.error('Drip process error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
