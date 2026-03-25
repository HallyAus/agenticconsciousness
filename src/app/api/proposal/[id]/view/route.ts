import { NextRequest, NextResponse } from 'next/server';
import { getProposal, saveProposal } from '@/lib/proposals';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const proposal = getProposal(id);
    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (proposal.status === 'sent') {
      proposal.status = 'viewed';
      proposal.viewedAt = new Date().toISOString();
      saveProposal(proposal);

      console.log(JSON.stringify({ event: 'proposal_viewed', id, client: proposal.clientCompany, timestamp: new Date().toISOString() }));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
