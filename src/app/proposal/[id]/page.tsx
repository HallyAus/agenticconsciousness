import type { Metadata } from 'next';
import { getProposal } from '@/lib/proposals';
import { notFound } from 'next/navigation';
import ProposalAcceptance from '@/components/ProposalAcceptance';
import EmailLink from '@/components/EmailLink';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const proposal = getProposal(id);
  return {
    title: proposal ? `Proposal: ${proposal.title}` : 'Proposal Not Found',
    robots: { index: false, follow: false },
  };
}

export default async function ProposalPage({ params }: Props) {
  const { id } = await params;
  const proposal = getProposal(id);

  if (!proposal) notFound();

  const isExpired = new Date(proposal.validUntil) < new Date() && proposal.status !== 'accepted';
  const isAccepted = proposal.status === 'accepted';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Top bar */}
      <div className="h-[60px] px-10 flex justify-between items-center border-b-2 max-md:px-5" style={{ borderColor: 'var(--red)', background: 'var(--bg-nav)' }}>
        <span className="font-display font-black text-[1.1rem] text-text-primary tracking-snug">
          AC<span style={{ color: 'var(--red-text)' }}>_</span>
        </span>
        <span className="font-mono text-[0.75rem] max-sm:text-xs text-text-dim tracking-[2px] uppercase">
          PROPOSAL {id.slice(0, 8)}
        </span>
      </div>

      <article className="max-w-[800px] mx-auto py-16 px-10 max-md:px-5 max-sm:px-4">
        {/* Header */}
        <h1 className="text-[clamp(1.5rem,4vw,2.2rem)] font-black tracking-tight text-text-primary mb-6">
          {proposal.title}
        </h1>
        <div className="flex justify-between gap-8 flex-wrap mb-8 text-[0.8rem]">
          <div>
            <div className="text-text-dim font-light">Prepared for</div>
            <div className="text-text-primary font-bold">{proposal.clientName}</div>
            <div className="text-text-dim font-light">{proposal.clientCompany}</div>
          </div>
          <div className="text-right max-md:text-left">
            <div className="text-text-dim font-light">Date: {formatDate(proposal.createdAt)}</div>
            <div className="text-text-dim font-light">Valid until: {formatDate(proposal.validUntil)}</div>
          </div>
        </div>
        <div className="h-[2px] mb-10" style={{ background: 'var(--red)' }} />

        {isExpired && (
          <div className="p-6 mb-10 border-2 text-center" style={{ borderColor: 'var(--red)', background: 'var(--red-faint)' }}>
            <div className="font-black text-[1.1rem] text-text-primary mb-2">This proposal has expired.</div>
            <p className="text-text-dim text-[0.85rem] font-light">Contact us for an updated proposal.</p>
            <EmailLink className="inline-block font-display text-[0.8rem] max-sm:text-xs font-black tracking-[2px] uppercase py-2 px-6 mt-4 no-underline text-white" style={{ background: 'var(--red)' }}>
              Request new proposal →
            </EmailLink>
          </div>
        )}

        {/* Summary */}
        <div className="mb-10">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>OVERVIEW</div>
          <p className="text-text-dim text-[0.95rem] font-light leading-[1.7] border-l-[3px] pl-5" style={{ borderColor: 'var(--red)' }}>
            {proposal.summary}
          </p>
        </div>

        {/* Scope */}
        <div className="mb-10">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>SCOPE OF WORK</div>
          <div className="text-text-dim text-[0.9rem] font-light leading-[1.7] whitespace-pre-line">
            {proposal.scopeOfWork}
          </div>
        </div>

        {/* Deliverables */}
        <div className="mb-10">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>DELIVERABLES</div>
          <div className="flex flex-col gap-[2px]">
            {proposal.deliverables.map((d, i) => (
              <div key={i} className="flex gap-4 p-4" style={{ background: 'var(--bg-card)' }}>
                <span className="font-mono text-[0.8rem] max-sm:text-xs font-bold" style={{ color: 'var(--red-text)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-text-dim text-[0.85rem] font-light">{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-10">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>TIMELINE</div>
          <p className="text-text-dim text-[0.9rem] font-light">{proposal.timeline}</p>
        </div>

        {/* Pricing */}
        <div className="mb-10">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>INVESTMENT</div>
          <div style={{ background: 'var(--bg-card)' }}>
            <div className="grid grid-cols-[1fr_auto] text-[0.8rem]" style={{ background: 'var(--red)' }}>
              <div className="py-2 px-4 text-white font-bold">Description</div>
              <div className="py-2 px-4 text-white font-bold text-right">Amount</div>
            </div>
            {proposal.lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] text-[0.85rem] border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="py-3 px-4 text-text-dim font-light">{item.description}</div>
                <div className="py-3 px-4 text-text-primary text-right">{formatCurrency(item.amount)}</div>
              </div>
            ))}
            <div className="border-t-2 px-4 py-3 flex flex-col gap-1" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex justify-between text-[0.85rem]">
                <span className="text-text-dim">Subtotal</span>
                <span className="text-text-primary">{formatCurrency(proposal.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[0.85rem]">
                <span className="text-text-dim">GST (10%)</span>
                <span className="text-text-primary">{formatCurrency(proposal.gst)}</span>
              </div>
              <div className="flex justify-between text-[1rem] font-black border-t pt-2 mt-1" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-text-primary">Total</span>
                <span style={{ color: 'var(--red-text)' }}>{formatCurrency(proposal.total)}</span>
              </div>
            </div>
          </div>
          <p className="text-text-ghost text-[0.8rem] max-sm:text-xs font-mono mt-2">All prices in AUD inclusive of GST.</p>
        </div>

        {/* Terms */}
        <div className="mb-10">
          <div className="font-mono text-[0.8rem] max-sm:text-xs tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>TERMS</div>
          <ul className="flex flex-col gap-2 list-none">
            {proposal.terms.map((term, i) => (
              <li key={i} className="flex gap-2 text-[0.82rem] text-text-dim font-light">
                <span style={{ color: 'var(--red-text)' }}>■</span>
                {term}
              </li>
            ))}
          </ul>
        </div>

        {/* Acceptance */}
        {isAccepted ? (
          <div className="p-6 border-2" style={{ borderColor: 'var(--status-green)' }}>
            <div className="font-black text-[1rem] mb-1" style={{ color: 'var(--status-green)' }}>✓ ACCEPTED</div>
            <p className="text-text-dim text-[0.85rem] font-light">
              Accepted by {proposal.signatureName} on {formatDate(proposal.acceptedAt!)}.
              A confirmation has been sent to {proposal.clientEmail}.
            </p>
          </div>
        ) : !isExpired ? (
          <ProposalAcceptance proposalId={id} clientEmail={proposal.clientEmail} total={proposal.total} />
        ) : null}

        {/* Footer */}
        <div className="mt-16 pt-6 border-t text-center" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="font-mono text-[0.75rem] max-sm:text-xs text-text-ghost tracking-[1px]">
            Agentic Consciousness — ai@agenticconsciousness.com.au
          </p>
        </div>
      </article>
    </main>
  );
}
