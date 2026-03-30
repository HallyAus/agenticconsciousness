import fs from 'fs';
import path from 'path';

const PROPOSALS_DIR = path.join(process.cwd(), 'content', 'proposals');

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

export function getProposal(id: string): Proposal | null {
  if (!isValidId(id)) return null;
  const filePath = path.join(PROPOSALS_DIR, `${id}.json`);
  if (!filePath.startsWith(PROPOSALS_DIR)) return null; // path traversal guard
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveProposal(proposal: Proposal): void {
  if (!isValidId(proposal.id)) throw new Error('Invalid proposal ID');
  if (!fs.existsSync(PROPOSALS_DIR)) fs.mkdirSync(PROPOSALS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(PROPOSALS_DIR, `${proposal.id}.json`),
    JSON.stringify(proposal, null, 2)
  );
}
