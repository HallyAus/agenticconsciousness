import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Agentic Consciousness — how we handle your data.',
};

export default function PrivacyPage() {
  return (
    <main className="pt-[60px] min-h-screen">
      <article className="py-28 px-10 max-md:px-5 max-sm:py-20">
        <div className="max-w-[720px] mx-auto">
          <div className="font-mono text-[0.7rem] tracking-[3px] uppercase mb-3" style={{ color: 'var(--red-text)' }}>LEGAL</div>
          <h1 className="text-[clamp(1.8rem,4vw,2.5rem)] font-black tracking-tight leading-[1.1] mb-8 text-text-primary">
            Privacy Policy
          </h1>
          <div className="text-text-dim text-[0.9rem] font-light leading-[1.8] flex flex-col gap-6">
            <p><strong className="text-text-primary font-bold">Last updated:</strong> March 2026</p>

            <p>Agentic Consciousness Pty Ltd (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the website agenticconsciousness.com.au. This policy explains how we collect, use, and protect your information.</p>

            <h2 className="text-[1.1rem] font-black text-text-primary mt-4">Information we collect</h2>
            <p>We collect information you provide directly: name, email address, business details, and any content you input into our AI tools (invoices, quotes, competitor names). We also collect technical data: IP address, browser type, and pages visited.</p>

            <h2 className="text-[1.1rem] font-black text-text-primary mt-4">How we use your information</h2>
            <p>We use your information to: provide AI-powered tools and analysis, respond to enquiries, send email communications you&apos;ve opted into, improve our services, and comply with legal obligations.</p>

            <h2 className="text-[1.1rem] font-black text-text-primary mt-4">AI-powered tools</h2>
            <p>Data you input into our tools (invoice text, business descriptions, competitor names) is sent to Anthropic&apos;s Claude API for processing. This data is not stored by Anthropic for training purposes. We log metadata (token usage, timestamps) but do not permanently store the content of your tool inputs beyond your session.</p>

            <h2 className="text-[1.1rem] font-black text-text-primary mt-4">Email communications</h2>
            <p>If you provide your email through our tools, audit, or contact form, you may receive a limited email sequence (maximum 5 emails over 14 days). Every email includes an unsubscribe link. We will never sell your email to third parties.</p>

            <h2 className="text-[1.1rem] font-black text-text-primary mt-4">Cookies and tracking</h2>
            <p>We use localStorage for theme preferences and session tracking. If configured, we use Meta Pixel and Google Ads remarketing tags for advertising purposes. You can opt out via your browser&apos;s cookie settings or by using an ad blocker.</p>

            <h2 className="text-[1.1rem] font-black text-text-primary mt-4">Data security</h2>
            <p>We use HTTPS encryption, Cloudflare protection, and restrict access to stored data. However, no method of electronic transmission is 100% secure.</p>

            <h2 className="text-[1.1rem] font-black text-text-primary mt-4">Your rights</h2>
            <p>Under Australian Privacy Principles, you have the right to access, correct, or delete your personal information. Contact us at ai@agenticconsciousness.com.au to exercise these rights.</p>

            <h2 className="text-[1.1rem] font-black text-text-primary mt-4">Contact</h2>
            <p>Agentic Consciousness Pty Ltd<br />Email: <a href="mailto:ai@agenticconsciousness.com.au" className="no-underline hover:underline" style={{ color: 'var(--red-text)' }}>ai@agenticconsciousness.com.au</a><br />Australia</p>
          </div>
        </div>
      </article>
    </main>
  );
}
