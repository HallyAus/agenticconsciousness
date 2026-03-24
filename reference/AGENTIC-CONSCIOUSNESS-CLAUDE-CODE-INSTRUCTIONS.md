# Agentic Consciousness — Full Claude Code Build Instructions

## Project Overview

Build a production AI consulting website for **Agentic Consciousness** — an AI consulting business founded by Daniel Hall. The site uses a **neural brutalist** design aesthetic (black + electric red #ff3d00, massive bold typography, raw industrial blocks, zero rounded corners). It includes a live AI chatbot powered by the Anthropic Claude API.

**Domain:** (to be configured)
**Contact email:** hello@agenticconsciousness.com
**Owner:** Daniel Hall — 21+ years industry experience

---

## 1. Project Initialisation

```bash
# Create Next.js project with App Router and TypeScript
npx create-next-app@latest agentic-consciousness --typescript --tailwind --app --src-dir --eslint
cd agentic-consciousness

# Install dependencies
npm install framer-motion
npm install @anthropic-ai/sdk
npm install lucide-react

# Create project structure
mkdir -p src/app/api/chat
mkdir -p src/components
mkdir -p src/lib
mkdir -p public/fonts
```

---

## 2. Environment Variables

Create `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
NEXT_PUBLIC_CONTACT_EMAIL=hello@agenticconsciousness.com
```

Create `.env.example` (commit this, not .env.local):

```env
ANTHROPIC_API_KEY=
NEXT_PUBLIC_CONTACT_EMAIL=hello@agenticconsciousness.com
```

Add to `.gitignore`:

```
.env.local
```

---

## 3. Design System

### 3.1 Tailwind Config

Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ac: {
          red: "#ff3d00",
          "red-dim": "rgba(255, 61, 0, 0.6)",
          "red-faint": "rgba(255, 61, 0, 0.1)",
          "red-glow": "rgba(255, 61, 0, 0.08)",
          black: "#0a0a0a",
          card: "#111111",
          "card-hover": "#161616",
          block: "#1a1a1a",
        },
        text: {
          primary: "rgba(255, 255, 255, 0.88)",
          dim: "rgba(255, 255, 255, 0.4)",
          ghost: "rgba(255, 255, 255, 0.15)",
          dead: "rgba(255, 255, 255, 0.06)",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          red: "rgba(255, 61, 0, 0.25)",
        },
      },
      fontFamily: {
        display: ['"Be Vietnam Pro"', "sans-serif"],
        mono: ['"Space Mono"', "monospace"],
      },
      letterSpacing: {
        brutal: "-3px",
        tight: "-2px",
        snug: "-0.5px",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "red-line": "redLine 1s ease-out forwards",
        blink: "blink 2s infinite",
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        redLine: {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### 3.2 Global Styles

Update `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;700;900&family=Space+Mono:wght@400;700&display=swap");

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background: #0a0a0a;
  color: rgba(255, 255, 255, 0.88);
  font-family: "Be Vietnam Pro", sans-serif;
  overflow-x: hidden;
}

::selection {
  background: #ff3d00;
  color: #ffffff;
}

::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: #0a0a0a;
}
::-webkit-scrollbar-thumb {
  background: #ff3d00;
}

/* Noise texture overlay */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 256px;
  pointer-events: none;
  z-index: 9998;
}
```

---

## 4. Layout & Metadata

### 4.1 Root Layout

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentic Consciousness — AI Consulting",
  description:
    "AI strategy, tool implementation, and automation consulting. We build and deploy AI systems that run your business better than you thought possible.",
  keywords: [
    "AI consulting",
    "AI strategy",
    "AI automation",
    "ChatGPT",
    "Claude",
    "AI workshops",
    "Australia",
  ],
  openGraph: {
    title: "Agentic Consciousness — AI Consulting",
    description:
      "We don't just advise — we build and deploy AI systems that run your business.",
    type: "website",
    locale: "en_AU",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

---

## 5. Components

Build each component as a separate file in `src/components/`. Every component is a React Server Component unless it needs interactivity (marked with `"use client"`).

### 5.1 Navigation — `src/components/Nav.tsx`

```
"use client" component.

Fixed top nav bar with:
- Logo: "AC" with underscore in red (AC_) — links to top of page
- Nav links: Services, Method, Work, About — anchor links to #services, #process, #cases, #about
- CTA button: "TALK TO US" — links to #contact
- Mobile: hamburger menu that toggles link visibility
- Style: height 60px, background rgba(10,10,10,0.92) with backdrop-filter blur(12px), border-bottom 2px solid #ff3d00
- All text uppercase, font-weight 900, letter-spacing 2px
- CTA: background #ff3d00, on hover inverts to white bg / black text
```

### 5.2 Hero — `src/components/Hero.tsx`

```
Server component (animations via CSS/framer-motion wrapper).

Structure:
1. Tag row: "AI" tag (red bg) + "Consulting" + "Automation" + "Strategy" tags (ghost bg)
2. h1 with two lines:
   - "AGENTIC" — white, clamp(3.5rem, 9vw, 7rem), font-weight 900, letter-spacing -3px
   - "CONSCIOUSNESS" — #ff3d00, same sizing
3. Description paragraph with red left border (3px solid #ff3d00, padding-left 1.25rem):
   "We don't just advise — we build and deploy AI systems that run your business better than you thought possible."
4. Two buttons:
   - "FREE CONSULTATION →" — filled red, links to #contact
   - "SEE RESULTS" — outlined red, links to #cases
5. Counter row (below, with top border):
   - "21+" / "YEARS EXPERIENCE"
   - "3" / "SERVICE PILLARS"
   - "100%" / "AI-POWERED"

Counter values: font-size 2.5rem, weight 900, color #ff3d00
Counter labels: Space Mono, 0.6rem, uppercase, letter-spacing 2px

Subtle red glow in top-right corner using absolute positioned div with linear-gradient.
Staggered fadeInUp animations with 50ms delays between elements.
```

### 5.3 Services — `src/components/Services.tsx`

```
Section with id="services".

Header row (flexbox space-between):
- Left: label "001 / SERVICES" (Space Mono, red) + title "What we build." (3.5rem, weight 900)
- Right: description text (dim color, max-width 400px)

Below: 3-column grid of service blocks separated by 2px gaps (use bg on parent for gap color).

Each block:
- Background: #111111, hover → #161616
- Top border: 3px solid — first block full red, second 60% opacity, third 35% opacity
- Large ghost number (01, 02, 03) — 4rem, weight 900, color rgba(255,255,255,0.06)
- Title: 1.15rem, weight 900, white
- Description: 0.85rem, dim text, weight 300
- Pill tags row: Space Mono, 0.55rem, uppercase, red text, red border

Block 1 — "Strategy & Workshops"
  Pills: Roadmaps, Workshops, Audits, Team training
  Copy: "No-fluff sessions that demystify AI for your team. We map your operations, find the quick wins, and build a practical roadmap you can actually execute on."

Block 2 — "Tool Implementation"
  Pills: ChatGPT, Claude, Copilot, Custom
  Copy: "ChatGPT. Claude. Copilot. Custom models. We deploy AI tools into your existing stack, configure them properly, and train your team to use them from day one."

Block 3 — "Automation & Agents"
  Pills: Pipelines, Agents, Workflows, Integrations
  Copy: "End-to-end autonomous pipelines that eliminate busywork. Document processing, customer service, scheduling, reporting — systems that run themselves."
```

### 5.4 Process — `src/components/Process.tsx`

```
Section with id="process".

Header row same pattern as Services:
- Label: "002 / METHOD"
- Title: "How we work."
- Desc: "A proven framework. Zero to autonomous in four phases."

4-column grid of process cards, 2px gap.

Each card:
- Background: #111111, hover → #161616
- Red line animates in on hover (::before pseudo, scaleX 0→1, transform-origin left)
- Phase label: Space Mono, 0.6rem, red, letter-spacing 3px
- Title: 1rem, weight 900
- Description: 0.8rem, dim, weight 300

Cards:
1. PHASE 01 / "Discovery" — "Free, no-obligation conversation. We learn your pain points, workflows, and goals. You learn what AI can actually do for you."
2. PHASE 02 / "Audit" — "We assess your tools, data maturity, and team capabilities. You get a clear report — what's possible, what to prioritise, what to skip."
3. PHASE 03 / "Deploy" — "Rapid implementation sprint. We set up, integrate, and test AI solutions in your environment. Your team gets trained hands-on."
4. PHASE 04 / "Scale" — "Ongoing refinement from real usage data. We expand what works, cut what doesn't, and keep your AI capabilities evolving."

Responsive: 2 columns on tablet, 1 column on mobile.
```

### 5.5 Case Studies — `src/components/CaseStudies.tsx`

```
Section with id="cases".

Header:
- Label: "003 / RESULTS"
- Title: "Proof of work."
- Desc: "Real outcomes. Names changed to protect the competitive advantage we gave them."

Vertical stack of case rows, 2px gap.

Each row is a 3-column grid: [200px industry] [1fr content] [auto metrics]

- Industry column: centered text, Space Mono 0.6rem, red, letter-spacing 3px, uppercase. Right border 2px solid red.
- Content column: title (1.1rem weight 900) + description (0.85rem dim)
- Metrics column: stacked metric blocks. Value = 1.8rem weight 900 white. Label = Space Mono 0.55rem dim uppercase.

Case 1 — Manufacturing
  "Automated Quality Inspection Pipeline"
  "Replaced manual visual inspection with AI-powered defect detection. Cut QA processing time by 62% while pushing defect catch rate to 99.2%."
  Metrics: -62% / Processing time, $340K / Annual savings

Case 2 — Professional Services
  "AI-Augmented Proposal Generation"
  "Deployed an AI writing and research pipeline that tripled proposal output. Win rate increased 18% with higher-quality, personalised submissions."
  Metrics: 3.5x / Output increase, +18% / Win rate

Case 3 — Trades & Services
  "Smart Scheduling & Customer Comms"
  "Built an AI assistant handling bookings, rescheduling, and follow-ups automatically. Owner reclaimed 8+ hours per week of admin time."
  Metrics: -8hrs / Per week admin, 96% / Satisfaction

Responsive: stack to single column on mobile, industry becomes top bar with bottom border instead of right border.
```

### 5.6 About — `src/components/About.tsx`

```
Section with id="about".

Header:
- Label: "004 / ABOUT"
- Title: "Who we are."

2x2 grid of blocks, 2px gap.

Block 1: Large red "21+" number (2rem weight 900) + "Years in the field" + "Founded by Daniel Hall — two decades of hands-on industry experience across enterprise systems, automation, and technology implementation. This isn't theory. It's applied intelligence."

Block 2: "We build what we sell" + "This entire website is AI-powered — including the chatbot in the corner. We practice what we preach. Every tool, every workflow, every recommendation comes from real-world deployment experience."

Block 3: "Australian-based" + "We work across all industries and business sizes — SMBs, enterprise, tradies, startups. If you have operations, we can make them smarter. Based in Australia, available nationally."

Block 4: "AI-native approach" + "We don't just bolt AI onto your existing processes. We rethink workflows from the ground up with intelligence at the centre. The result: systems that don't just assist — they operate."
```

### 5.7 CTA — `src/components/CTA.tsx`

```
Section with id="contact".

Outer container with inner bordered box: 2px solid #ff3d00, bg #111111.

Giant ghost watermark: "AC" in absolute center, font-size 20rem, weight 900, color rgba(255,255,255,0.06).

Content (relative z-index above watermark):
- Label: "READY?"
- Title: "Let's build something intelligent." — "intelligent." in red
- Description: "Book a free AI introduction session. No sales pitch — just a direct conversation about what AI can do for your business right now."
- Two buttons:
  - "BOOK YOUR FREE INTRO →" — filled red, mailto:hello@agenticconsciousness.com
  - "ASK OUR AI" — outlined red, triggers chatbot open
```

### 5.8 Footer — `src/components/Footer.tsx`

```
Flexbox row: brand left, links center, copyright right.
Top border: 2px solid #ff3d00.
Brand: "AC_" with underscore in red.
Links: Services, Method, Work, Contact — same style as nav.
Copyright: Space Mono 0.55rem ghost text. "© 2026 AGENTIC CONSCIOUSNESS. ALL RIGHTS RESERVED."
```

### 5.9 Divider — `src/components/Divider.tsx`

```
Simple 2px height div, background #ff3d00.
Animate with redLine keyframe (scaleX 0→1, transform-origin left) when it enters viewport.
Use Intersection Observer or framer-motion whileInView.
```

### 5.10 Chatbot — `src/components/Chatbot.tsx`

```
"use client" component. This is the most complex component.

TOGGLE BUTTON:
- Fixed bottom-right (1.5rem from edges)
- 56px square, bg #ff3d00, white text "AC"
- On hover: white bg, black text
- When open: shows "✕" instead, white bg

CHAT WINDOW:
- Fixed, bottom 5.5rem, right 1.5rem
- 400px wide, 500px tall (responsive: full width on mobile)
- Background: #0a0a0a
- Border: 2px solid #ff3d00
- NO rounded corners

HEADER:
- Green status dot (7px, animated blink)
- Title: "AC NEURAL AGENT" — 0.7rem weight 900 uppercase
- Subtitle: "Powered by Claude — ask anything" — Space Mono 0.55rem dim

MESSAGES AREA:
- Scrollable flex column
- Bot messages: left-aligned, bg #1a1a1a, left border 2px solid red
- User messages: right-aligned, bg #ff3d00, white text
- Typing indicator: three dots pulsing animation

INPUT AREA:
- Text input + SEND button
- Input: bg #0a0a0a, border subtle, focus border red
- Send button: bg #ff3d00, weight 900, letter-spacing 2px

INITIAL MESSAGE:
"I'm the Agentic Consciousness AI. Ask me about our services, AI strategy, or how we can upgrade your business. I'm not a chatbot template — I'm Claude, running live."

API calls go to /api/chat (internal Next.js route).
Maintain conversation history in React state.
Show typing indicator while waiting for response.
Disable send button while loading.
Error fallback: "Connection error. Try again or reach us at hello@agenticconsciousness.com"
```

### 5.11 ScrollReveal wrapper — `src/components/ScrollReveal.tsx`

```
"use client" component using framer-motion or Intersection Observer.
Wraps section content. Fades in + translates up when entering viewport.
Props: children, delay (optional), threshold (default 0.08).
```

---

## 6. Chat API Route

Create `src/app/api/chat/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are the AI assistant for Agentic Consciousness, an AI consulting company founded by Daniel Hall — a professional with 21+ years of industry experience.

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
- Contact: hello@agenticconsciousness.com

Tone: Direct. Confident. No corporate waffle. Keep responses concise (2-4 sentences unless detail is asked for). Use Australian English spelling.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array required" },
        { status: 400 }
      );
    }

    // Limit conversation history to last 20 messages to manage token usage
    const trimmedMessages = messages.slice(-20);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: trimmedMessages,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
```

---

## 7. Main Page

Create `src/app/page.tsx`:

```tsx
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Process from "@/components/Process";
import CaseStudies from "@/components/CaseStudies";
import About from "@/components/About";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import Divider from "@/components/Divider";
import Chatbot from "@/components/Chatbot";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <Services />
      <Divider />
      <Process />
      <Divider />
      <CaseStudies />
      <Divider />
      <About />
      <Divider />
      <CTA />
      <Footer />
      <Chatbot />
    </>
  );
}
```

---

## 8. Design Rules — CRITICAL

These rules define the neural brutalist aesthetic. Never deviate.

1. **ZERO rounded corners.** No border-radius anywhere. Not on buttons, cards, inputs, the chat window — nothing. Everything is sharp rectangles.

2. **Three colours only.** Black (#0a0a0a and shades), white (with varying opacity), and red (#ff3d00). The only exception is the green status dot (#39ff14) on the chatbot.

3. **Typography is the design.** Headlines at weight 900 with tight negative letter-spacing (-2px to -3px). Body text at weight 300 for contrast. All labels/metadata in Space Mono uppercase with wide letter-spacing.

4. **2px red borders are structural.** They separate sections (dividers), frame important containers (CTA box, chat window, nav bottom), and mark content hierarchy (left borders on descriptions, top borders on service blocks).

5. **2px gaps between blocks, not padding.** Service blocks, process cards, case study rows — they sit in a grid with 2px gaps and a dark background showing through. This creates the brutalist "raw material" feel.

6. **Ghost elements for depth.** Large faded numbers (01, 02, 03 at 6% opacity), the giant "AC" watermark in the CTA section. These add visual mass without competing with content.

7. **Hover states are immediate.** Background shifts from #111111 → #161616. No easing longer than 0.2s. Red lines that scaleX in from the left. Buttons invert (red→white or outlined→filled).

8. **Animations are restrained.** fadeInUp on scroll (0.6s, staggered 50ms). Red divider lines animate once. No bouncing, no parallax, no particle effects. The brutalist aesthetic demands confidence, not spectacle.

---

## 9. Deployment

### 9.1 Docker (Self-hosted)

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

Add to `next.config.ts`:

```typescript
const nextConfig = {
  output: "standalone",
};
export default nextConfig;
```

Create `docker-compose.yml`:

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXT_PUBLIC_CONTACT_EMAIL=${NEXT_PUBLIC_CONTACT_EMAIL}
    restart: unless-stopped
```

### 9.2 Cloudflare Tunnel (if using home Proxmox server)

```bash
# On the Proxmox VM running Docker
cloudflared tunnel create ac-website
cloudflared tunnel route dns ac-website yourdomain.com.au

# Create config.yml for cloudflared
# tunnel: <tunnel-id>
# credentials-file: /root/.cloudflared/<tunnel-id>.json
# ingress:
#   - hostname: yourdomain.com.au
#     service: http://localhost:3000
#   - service: http_status:404
```

### 9.3 Alternative: Vercel

```bash
# Just push to GitHub and connect to Vercel
# Add ANTHROPIC_API_KEY in Vercel dashboard > Settings > Environment Variables
npm i -g vercel
vercel
```

---

## 10. Post-Launch Checklist

- [ ] Replace placeholder case studies with real client work as you land engagements
- [ ] Set up the actual contact email (hello@agenticconsciousness.com) or swap to a Calendly/Cal.com booking link
- [ ] Add Google Analytics or Plausible Analytics for visitor tracking
- [ ] Add `robots.txt` and `sitemap.xml` (Next.js can generate these automatically)
- [ ] Set up rate limiting on `/api/chat` to prevent API abuse (e.g. using `next-rate-limit` or Cloudflare WAF rules)
- [ ] Add CORS headers to the chat API if needed
- [ ] Consider adding a privacy policy page and terms of service
- [ ] Test on mobile devices — especially the chatbot fullscreen mode
- [ ] Set up Cloudflare DNS with proxying enabled for DDoS protection
- [ ] Monitor Anthropic API usage and set billing alerts

---

## 11. File Structure (Final)

```
agentic-consciousness/
├── .env.local
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── api/
    │       └── chat/
    │           └── route.ts
    ├── components/
    │   ├── Nav.tsx
    │   ├── Hero.tsx
    │   ├── Services.tsx
    │   ├── Process.tsx
    │   ├── CaseStudies.tsx
    │   ├── About.tsx
    │   ├── CTA.tsx
    │   ├── Footer.tsx
    │   ├── Divider.tsx
    │   ├── Chatbot.tsx
    │   └── ScrollReveal.tsx
    └── lib/
        └── (utility files as needed)
```

---

## 12. Claude Code Session Commands

When you start a Claude Code session to build this, use these commands:

```bash
# Start the session
claude

# Paste this as your first prompt:
```

> Read the file AGENTIC-CONSCIOUSNESS-CLAUDE-CODE-INSTRUCTIONS.md in the project root. This is the complete build spec for an AI consulting website called Agentic Consciousness. Build every component and file described in the instructions. Start with project init, then work through each component in order. Follow the design rules exactly — neural brutalist aesthetic, zero rounded corners, three colours only (black, white, red #ff3d00). Build the chat API route with the Anthropic SDK. Make sure everything compiles and the dev server runs clean before finishing.

```bash
# If you need to iterate on specific components:
claude "Fix the Chatbot component — the typing indicator dots aren't animating. Check the CSS keyframes."
claude "The service blocks need more breathing room on mobile. Make them single column below 640px."
claude "Add a rate limiter to the /api/chat route — max 10 requests per minute per IP."
```

---

## 13. Reference: Complete HTML Prototype

The working HTML prototype is included alongside this file as `agentic-consciousness-v2.html`. This is the source of truth for exact colours, spacing, typography, copy, and layout. When building the Next.js components, reference this file for pixel-accurate implementation.

Every CSS value, every piece of copy, every animation timing in the HTML prototype should be faithfully translated into the component-based Next.js architecture described above.
