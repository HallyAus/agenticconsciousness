import { NextRequest, NextResponse } from 'next/server';
import { getProposal, saveProposal } from '@/lib/proposals';
import fs from 'fs';
import path from 'path';
import { sendEmail, notifyAdmin, emailTemplate } from '@/lib/email';
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

    // Client confirmation
    await sendEmail({
      to: proposal.clientEmail,
      subject: `Proposal Accepted — ${proposal.title}`,
      html: emailTemplate(`
        <h2 style="color:#fff;font-size:20px;margin:0 0 16px">Proposal accepted</h2>
        <p style="color:#e0e0e0"><strong style="color:#fff">${proposal.title}</strong> has been accepted.</p>
        <p style="color:#e0e0e0">Total: <strong style="color:#ff3d00">$${proposal.total.toLocaleString()}</strong> AUD (inc. GST)</p>
        <p style="color:#e0e0e0">We'll be in touch within 24 hours to schedule your kickoff.</p>
        <a href="mailto:ai@agenticconsciousness.com.au" style="display:inline-block;background:#ff3d00;color:#fff;padding:10px 24px;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;margin-top:12px">CONTACT US →</a>
      `),
    });

    // Admin notification
    await notifyAdmin(
      `Proposal Accepted: ${proposal.clientCompany} — $${proposal.total.toLocaleString()}`,
      `Client: ${proposal.clientName}\nCompany: ${proposal.clientCompany}\nEmail: ${proposal.clientEmail}\nTitle: ${proposal.title}\nTotal: $${proposal.total}\nSigned by: ${signatureName}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Proposal accept error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to accept' }, { status: 500 });
  }
}
