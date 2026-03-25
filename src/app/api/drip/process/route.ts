import { NextRequest, NextResponse } from 'next/server';
import { getSubscribers, saveSubscribers, DRIP_SCHEDULE } from '@/lib/drip';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const authKey = req.headers.get('Authorization');
  if (authKey !== `Bearer ${process.env.BLOG_ADMIN_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subscribers = getSubscribers();
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

          // Log to file
          const dataDir = path.join(process.cwd(), 'data');
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
          fs.appendFileSync(
            path.join(dataDir, 'drip-log.jsonl'),
            JSON.stringify({ email: sub.email, day: step.day, subject, sentAt: new Date().toISOString() }) + '\n'
          );

          sub.emailsSent.push(step.day);
          emailsSent++;
        }
      }
    }

    saveSubscribers(subscribers);

    return NextResponse.json({ processed: subscribers.length, emailsSent });
  } catch (error) {
    console.error('Drip process error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
