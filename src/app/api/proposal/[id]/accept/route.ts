import { NextRequest, NextResponse } from 'next/server';
import { getProposal, saveProposal } from '@/lib/proposals';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { signatureName } = await req.json();

    if (!signatureName || typeof signatureName !== 'string' || signatureName.trim().length === 0) {
      return NextResponse.json({ error: 'Signature name required' }, { status: 400 });
    }

    const proposal = getProposal(id);
    if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    if (proposal.status === 'accepted') return NextResponse.json({ error: 'Already accepted' }, { status: 400 });
    if (new Date(proposal.validUntil) < new Date()) return NextResponse.json({ error: 'Proposal expired' }, { status: 400 });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    proposal.status = 'accepted';
    proposal.acceptedAt = new Date().toISOString();
    proposal.signatureName = signatureName.trim();
    proposal.signatureIP = ip;

    saveProposal(proposal);

    // Log
    console.log('\n========== PROPOSAL ACCEPTED ==========');
    console.log(JSON.stringify({ event: 'proposal_accepted', id, client: proposal.clientCompany, total: proposal.total, signedBy: signatureName, timestamp: new Date().toISOString() }, null, 2));
    console.log('========================================\n');

    // Persist to leads
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.appendFileSync(path.join(dataDir, 'leads.jsonl'), JSON.stringify({ event: 'proposal_accepted', id, email: proposal.clientEmail, company: proposal.clientCompany, total: proposal.total, timestamp: new Date().toISOString() }) + '\n');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Proposal accept error:', error);
    return NextResponse.json({ error: 'Failed to accept' }, { status: 500 });
  }
}
