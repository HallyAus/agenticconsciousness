import { sql } from '@/lib/pg';

/**
 * A/B subject line variants. One row per named variant; at send time we
 * pick a random active one and render {{domain}}/{{businessName}} tokens.
 *
 * Default variants are seeded by the DB migration. Adding more happens
 * through the admin /settings page.
 */

export interface SubjectVariant {
  id: string;
  label: string;
  template: string;
  active: boolean;
  created_at: string;
}

export async function listVariants(): Promise<SubjectVariant[]> {
  const rows = (await sql`
    SELECT id, label, template, active, created_at
    FROM subject_variants
    ORDER BY active DESC, created_at ASC
  `) as SubjectVariant[];
  return rows;
}

export async function pickRandomActiveVariant(): Promise<SubjectVariant | null> {
  const rows = (await sql`
    SELECT id, label, template, active, created_at
    FROM subject_variants
    WHERE active = true
    ORDER BY random()
    LIMIT 1
  `) as SubjectVariant[];
  return rows[0] ?? null;
}

export async function createVariant(label: string, template: string): Promise<SubjectVariant> {
  const rows = (await sql`
    INSERT INTO subject_variants (label, template, active)
    VALUES (${label}, ${template}, true)
    RETURNING id, label, template, active, created_at
  `) as SubjectVariant[];
  return rows[0];
}

export async function toggleVariant(id: string, active: boolean): Promise<void> {
  await sql`UPDATE subject_variants SET active = ${active} WHERE id = ${id}`;
}

export async function deleteVariant(id: string): Promise<void> {
  await sql`DELETE FROM subject_variants WHERE id = ${id}`;
}

export function renderSubject(template: string, vars: { domain: string; businessName?: string | null }): string {
  return template
    .replace(/\{\{\s*domain\s*\}\}/g, vars.domain)
    .replace(/\{\{\s*businessName\s*\}\}/g, vars.businessName ?? vars.domain);
}
