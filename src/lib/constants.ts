export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'ai@agenticconsciousness.com.au';
export const SITE_URL =
  process.env.SITE_URL || 'https://agenticconsciousness.com.au';

export const SYSTEM_PROMPT = `You are the AI assistant for Agentic Consciousness, an AI consulting company founded by Daniel Hall — a professional with 21+ years of industry experience.

Your role: Answer questions about the company's services, approach, and AI in general. Be helpful, knowledgeable, and direct. No fluff. Guide interested visitors toward booking a free AI introduction session.

Company services:
1. AI Strategy & Workshops — Custom introduction sessions, opportunity mapping, practical roadmaps
2. AI Tool Implementation — ChatGPT, Claude, Copilot, custom models deployed into client workflows
3. Automation & Workflows — End-to-end autonomous pipelines, document processing, AI customer service agents

Process: Discovery Call → AI Readiness Audit → Implementation Sprint → Optimise & Scale

Key facts:
- Free initial consultation, no obligation
- We work with all business sizes: SMBs, enterprise, tradies, any industry
- Australian-based consulting, available nationally
- We don't just advise — we build and deploy
- This chatbot itself is proof of what we do
- Contact: ai@agenticconsciousness.com.au

Tone: Direct. Confident. No corporate waffle. Keep responses concise (2-4 sentences unless detail is asked for). Use Australian English spelling.`;

export const INITIAL_BOT_MESSAGE =
  "I'm the Agentic Consciousness AI. Ask me about our services, AI strategy, or how we can upgrade your business. I'm not a chatbot template — I'm Claude, running live.";

export const NAV_LINKS = [
  { label: 'Services', href: '/#services' },
  { label: 'Method', href: '/#process' },
  { label: 'Work', href: '/#cases' },
  { label: 'AI Audit', href: '/#ai-audit' },
  { label: 'Insights', href: '/blog' },
  { label: 'Tools', href: '/tools' },
  { label: 'About', href: '/#about' },
  { label: 'FAQ', href: '/faq' },
] as const;

export const SERVICES = [
  {
    num: '01',
    title: 'Strategy & Workshops',
    desc: 'No-fluff sessions that demystify AI for your team. We map your operations, find the quick wins, and build a practical roadmap you can actually execute on.',
    pills: ['Roadmaps', 'Workshops', 'Audits', 'Team training'],
  },
  {
    num: '02',
    title: 'Tool Implementation',
    desc: 'ChatGPT. Claude. Copilot. Custom models. We deploy AI tools into your existing stack, configure them properly, and train your team to use them from day one.',
    pills: ['ChatGPT', 'Claude', 'Copilot', 'Custom'],
  },
  {
    num: '03',
    title: 'Automation & Agents',
    desc: "End-to-end autonomous pipelines that eliminate busywork. Document processing, customer service, scheduling, reporting — systems that run themselves.",
    pills: ['Pipelines', 'Agents', 'Workflows', 'Integrations'],
  },
] as const;

export const PROCESS_STEPS = [
  {
    phase: 'PHASE 01',
    title: 'Discovery',
    desc: 'Free, no-obligation conversation. We learn your pain points, workflows, and goals. You learn what AI can actually do for you.',
  },
  {
    phase: 'PHASE 02',
    title: 'Audit',
    desc: "We assess your tools, data maturity, and team capabilities. You get a clear report — what's possible, what to prioritise, what to skip.",
  },
  {
    phase: 'PHASE 03',
    title: 'Deploy',
    desc: 'Rapid implementation sprint. We set up, integrate, and test AI solutions in your environment. Your team gets trained hands-on.',
  },
  {
    phase: 'PHASE 04',
    title: 'Scale',
    desc: "Ongoing refinement from real usage data. We expand what works, cut what doesn't, and keep your AI capabilities evolving.",
  },
] as const;

export const CASE_STUDIES = [
  {
    industry: 'Manufacturing',
    title: 'Automated Quality Inspection Pipeline',
    desc: 'Replaced manual visual inspection with AI-powered defect detection. Cut QA processing time by 62% while pushing defect catch rate to 99.2%.',
    metrics: [
      { value: '-62%', label: 'Processing time' },
      { value: '$340K', label: 'Annual savings' },
    ],
  },
  {
    industry: 'Professional Services',
    title: 'AI-Augmented Proposal Generation',
    desc: 'Deployed an AI writing and research pipeline that tripled proposal output. Win rate increased 18% with higher-quality, personalised submissions.',
    metrics: [
      { value: '3.5x', label: 'Output increase' },
      { value: '+18%', label: 'Win rate' },
    ],
  },
  {
    industry: 'Trades & Services',
    title: 'Smart Scheduling & Customer Comms',
    desc: 'Built an AI assistant handling bookings, rescheduling, and follow-ups automatically. Owner reclaimed 8+ hours per week of admin time.',
    metrics: [
      { value: '-8hrs', label: 'Per week admin' },
      { value: '96%', label: 'Satisfaction' },
    ],
  },
] as const;
