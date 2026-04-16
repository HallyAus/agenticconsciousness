import { NextRequest, NextResponse } from 'next/server';
import { getProposal, saveProposal } from '@/lib/proposals';
import { notifyAdmin } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip'))?.trim() || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
      { status: 429 }
    );
  }

  try {
    const { id } = await params;
    const proposal = await getProposal(id);
    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (proposal.status === 'sent') {
      proposal.status = 'viewed';
      proposal.viewedAt = new Date().toISOString();
      await saveProposal(proposal);

      console.log(JSON.stringify({ event: 'proposal_viewed', id, client: proposal.clientCompany, timestamp: new Date().toISOString() }));

      await notifyAdmin(
        `Proposal Viewed: ${proposal.clientCompany}`,
        `${proposal.clientName} just opened "${proposal.title}"\nTotal: $${proposal.total}`
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
