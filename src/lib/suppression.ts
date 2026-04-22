import { sql } from '@/lib/pg';

/**
 * Global email suppression list. Blocks re-adding unsubscribed or
 * problem addresses to prospects via the Places discovery flow.
 */

export async function isSuppressed(email: string): Promise<boolean> {
  if (!email) return false;
  const rows = (await sql`
    SELECT 1 FROM suppression_list WHERE lower(email) = lower(${email}) LIMIT 1
  `) as Array<{ '?column?'?: number }>;
  return rows.length > 0;
}

export async function addSuppression(email: string, source: string, reason?: string): Promise<void> {
  if (!email) return;
  await sql`
    INSERT INTO suppression_list (email, source, reason)
    VALUES (${email.toLowerCase().trim()}, ${source}, ${reason ?? null})
    ON CONFLICT (lower(email)) DO NOTHING
  `;
}

export async function removeSuppression(email: string): Promise<void> {
  await sql`DELETE FROM suppression_list WHERE lower(email) = lower(${email})`;
}

export async function listSuppressions(): Promise<Array<{ email: string; source: string; reason: string | null; added_at: string }>> {
  const rows = (await sql`
    SELECT email, source, reason, added_at FROM suppression_list ORDER BY added_at DESC
  `) as Array<{ email: string; source: string; reason: string | null; added_at: string }>;
  return rows;
}
