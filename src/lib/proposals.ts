import { sql } from './pg';

function isValidId(id: string): boolean {
  return /^[a-f0-9-]{36}$/.test(id);
}

export interface Proposal {
  id: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  industry: string;
  title: string;
  summary: string;
  scopeOfWork: string;
  deliverables: string[];
  timeline: string;
  lineItems: { description: string; amount: number }[];
  subtotal: number;
  gst: number;
  total: number;
  terms: string[];
  validUntil: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'expired';
  createdAt: string;
  viewedAt?: string;
  acceptedAt?: string;
  signatureName?: string;
  signatureIP?: string;
}

export async function getProposal(id: string): Promise<Proposal | null> {
  if (!isValidId(id)) return null;
  const rows = (await sql`SELECT data FROM proposals WHERE id = ${id}`) as { data: Proposal }[];
  return rows[0]?.data ?? null;
}

export async function saveProposal(proposal: Proposal): Promise<void> {
  if (!isValidId(proposal.id)) throw new Error('Invalid proposal ID');
  await sql`
    INSERT INTO proposals (id, data, created_at, updated_at)
    VALUES (${proposal.id}, ${JSON.stringify(proposal)}::jsonb, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `;
}
