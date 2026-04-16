import { sql } from './pg';

export interface DripSubscriber {
  email: string;
  name?: string;
  industry: string;
  source: 'quiz' | 'audit' | 'exit-intent';
  subscribedAt: string;
  emailsSent: number[];
  unsubscribed?: boolean;
}

interface Row {
  email: string;
  name: string | null;
  industry: string;
  source: string;
  subscribed_at: string;
  emails_sent: number[];
  unsubscribed: boolean;
}

function rowToSubscriber(r: Row): DripSubscriber {
  return {
    email: r.email,
    name: r.name ?? undefined,
    industry: r.industry,
    source: r.source as DripSubscriber['source'],
    subscribedAt: new Date(r.subscribed_at).toISOString(),
    emailsSent: r.emails_sent ?? [],
    unsubscribed: r.unsubscribed || undefined,
  };
}

export async function getSubscribers(): Promise<DripSubscriber[]> {
  const rows = (await sql`
    SELECT email, name, industry, source, subscribed_at, emails_sent, unsubscribed
    FROM drip_subscribers ORDER BY subscribed_at
  `) as Row[];
  return rows.map(rowToSubscriber);
}

export async function saveSubscribers(subs: DripSubscriber[]): Promise<void> {
  // Used by /api/drip/process to persist emails_sent updates. Upsert each row.
  for (const s of subs) {
    await sql`
      INSERT INTO drip_subscribers (email, name, industry, source, subscribed_at, emails_sent, unsubscribed)
      VALUES (
        ${s.email.toLowerCase()},
        ${s.name ?? null},
        ${s.industry},
        ${s.source},
        ${s.subscribedAt},
        ${s.emailsSent as unknown as string},
        ${!!s.unsubscribed}
      )
      ON CONFLICT (email) DO UPDATE SET
        emails_sent = EXCLUDED.emails_sent,
        unsubscribed = EXCLUDED.unsubscribed
    `;
  }
}

export async function addSubscriber(
  sub: Omit<DripSubscriber, 'subscribedAt' | 'emailsSent'>
): Promise<boolean> {
  const rows = (await sql`
    INSERT INTO drip_subscribers (email, name, industry, source, subscribed_at, emails_sent, unsubscribed)
    VALUES (
      ${sub.email.toLowerCase()},
      ${sub.name ?? null},
      ${sub.industry},
      ${sub.source},
      NOW(),
      '{}',
      FALSE
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING email
  `) as { email: string }[];
  return rows.length > 0;
}

export async function unsubscribeEmail(email: string): Promise<boolean> {
  const rows = (await sql`
    UPDATE drip_subscribers SET unsubscribed = TRUE
    WHERE email = ${email.toLowerCase()}
    RETURNING email
  `) as { email: string }[];
  return rows.length > 0;
}

export const DRIP_SCHEDULE = [
  { day: 0, subject: 'Your AI readiness results are in' },
  { day: 2, subject: "The #1 mistake businesses make with AI (and how to avoid it)" },
  { day: 5, subject: '3 AI tools you can use for free right now' },
  { day: 9, subject: 'How {industry} businesses are using AI in 2026' },
  { day: 14, subject: 'Your AI action plan is waiting' },
];
