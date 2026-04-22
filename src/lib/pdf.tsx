import React from 'react';
import QRCode from 'qrcode';
import { Document, Image, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { stripDashes } from '@/lib/text-hygiene';
import { SPRINT_CONFIG, AVG_JOB_VALUE_BY_VERTICAL } from '@/config/sprint';
import { estimateFindingLoss, estimateAuditTotal, formatRevenueRange, resolveVertical } from '@/lib/revenue-impact';

// NOTE: Font.registerHyphenationCallback was removed as part of the
// Vercel SIGKILL investigation (2026-04-22). The call ran inside
// native fontkit on every text node and is the first-ever Font.* API
// call in this file — introduced with phase A. If this turns out not
// to be the cause, restore from commit 525e80d.

/**
 * Audit PDF. Brand-aligned neural brutalist: red (#ff3d00) accents on
 * near-black ink, per-severity tinted finding backgrounds so the eye
 * scans the critical items first.
 *
 * House rules:
 *   - No em/en dashes. All copy goes through stripDashes on entry.
 *   - No fancy arrows. Only "->" / ":" ASCII is used.
 *   - No hardcoded year. scoreBand + CTA reference runtime date only.
 *   - Score calibration: 0-30 critical, 31-50 poor, 51-65 gaps,
 *     66-80 solid, 81-100 excellent.
 *
 * Type hierarchy:
 *   - 11pt body paragraphs (findingDetail, fixText, glanceBody, ctaBody)
 *   - 10pt sub-labels and meta (kickers, categoryPill, bullets)
 *   - 9pt severity chips + footer (intentional micro)
 */

const RED = '#ff3d00';
const RED_TINT = '#fff4f0';
const AMBER_TINT = '#fdf6e8';
const YELLOW_TINT = '#fffdf2';
const GREY_TINT = '#f6f6f6';
const PURPLE_TINT = '#f5f0fa';
const INK = '#0a0a0a';
const BODY = '#1f1f1f';
const DIM = '#4a4a4a';
const RULE = '#cccccc';
const PAPER_SOFT = '#f6f4f2';

const SEVERITY: Record<string, { chipBg: string; chipFg: string; label: string; accent: string; border: string }> = {
  critical: { chipBg: '#E53935', chipFg: '#ffffff', label: 'CRITICAL', accent: RED_TINT,    border: '#E53935' },
  high:     { chipBg: '#FB8C00', chipFg: '#ffffff', label: 'HIGH',     accent: AMBER_TINT,  border: '#FB8C00' },
  medium:   { chipBg: '#FDD835', chipFg: '#0a0a0a', label: 'MEDIUM',   accent: YELLOW_TINT, border: '#FDD835' },
  low:      { chipBg: '#757575', chipFg: '#ffffff', label: 'LOW',      accent: GREY_TINT,   border: '#9ca3af' },
  legal:    { chipBg: '#7c3aed', chipFg: '#ffffff', label: 'LEGAL',    accent: PURPLE_TINT, border: '#7c3aed' },
};

const MONO = 'Courier';
const MONO_BOLD = 'Courier-Bold';
const SANS = 'Helvetica';
const SANS_BOLD = 'Helvetica-Bold';

const styles = StyleSheet.create({
  // --- page shell ---
  page: {
    padding: 44,
    paddingBottom: 56,
    fontSize: 11,
    color: BODY,
    backgroundColor: '#ffffff',
    fontFamily: SANS,
    lineHeight: 1.55,
  },

  // --- brand bar ---
  brandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 0,
    borderBottomColor: RED,
    paddingBottom: 10,
    marginBottom: 24,
  },
  brandMark: {
    fontFamily: MONO_BOLD,
    fontSize: 11,
    color: INK,
    letterSpacing: 1,
  },
  brandKicker: {
    fontFamily: MONO,
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
  },

  // --- cover ---
  coverKicker: {
    fontFamily: MONO,
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
    marginBottom: 8,
  },
  coverTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 30,
    color: INK,
    lineHeight: 1.08,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  coverUrl: {
    fontFamily: MONO,
    fontSize: 11,
    color: RED,
    marginBottom: 22,
  },

  // --- score block ---
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 18,
    marginBottom: 10,
  },
  scoreBox: {
    borderWidth: 3,
    borderColor: RED,
    padding: 14,
    paddingHorizontal: 18,
    alignItems: 'flex-start',
  },
  scoreLabel: {
    fontFamily: MONO_BOLD,
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
    marginBottom: 4,
  },
  scoreNumber: {
    fontFamily: SANS_BOLD,
    fontSize: 64,
    color: INK,
    lineHeight: 0.95,
    letterSpacing: -2,
  },
  scoreOutOf: {
    fontFamily: MONO,
    fontSize: 10,
    color: DIM,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  scoreBand: {
    flex: 1,
    fontFamily: SANS_BOLD,
    fontSize: 13,
    color: INK,
    lineHeight: 1.3,
    paddingBottom: 10,
  },

  // --- at a glance ---
  glanceWrap: {
    padding: 14,
    backgroundColor: PAPER_SOFT,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: RED,
    marginTop: 18,
    marginBottom: 26,
  },
  glanceKicker: {
    fontFamily: MONO_BOLD,
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
    marginBottom: 6,
  },
  glanceBody: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.6,
  },

  // --- findings section ---
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderBottomColor: RULE,
    paddingBottom: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 18,
    color: INK,
    letterSpacing: -0.3,
  },
  sectionMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: DIM,
    letterSpacing: 1.5,
  },

  // --- individual finding ---
  // Simplest possible finding card: plain column with padding and
  // a background color. No border, no sidebar, no flex-row.
  // Every extra layout prop has been a NaN trigger at some point.
  findingWrap: {
    marginBottom: 14,
    padding: 12,
    paddingLeft: 16,
  },
  findingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  findingNumber: {
    fontFamily: MONO_BOLD,
    fontSize: 11,
    letterSpacing: 1,
  },
  severityPill: {
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
    fontFamily: MONO_BOLD,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  categoryPill: {
    fontFamily: MONO,
    fontSize: 9,
    color: DIM,
    letterSpacing: 1.2,
  },
  findingTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 13,
    color: INK,
    lineHeight: 1.25,
    marginBottom: 8,
    letterSpacing: -0.2,
  },

  // labelled blocks (WHAT WE FOUND / WHAT TO DO)
  labelBlock: {
    marginBottom: 8,
  },
  labelBlockLast: {
    marginBottom: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 2,
    borderLeftColor: RED,
    paddingLeft: 10,
    paddingTop: 3,
    paddingBottom: 3,
  },
  blockLabel: {
    fontFamily: MONO_BOLD,
    fontSize: 9,
    color: RED,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  blockBody: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.55,
  },
  blockBodyBold: {
    fontFamily: SANS_BOLD,
    fontSize: 11,
    color: INK,
    lineHeight: 1.55,
  },

  // --- stat strip (page 1 headline numbers) ---
  statStrip: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    marginBottom: 18,
  },
  statCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: INK,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  statLabel: {
    fontFamily: MONO_BOLD,
    fontSize: 8,
    color: RED,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: SANS_BOLD,
    fontSize: 22,
    color: INK,
    letterSpacing: -0.5,
    lineHeight: 1.05,
  },
  statValueSmall: {
    fontFamily: SANS_BOLD,
    fontSize: 14,
    color: INK,
    letterSpacing: -0.3,
    lineHeight: 1.15,
  },
  statSub: {
    fontFamily: MONO,
    fontSize: 8,
    color: DIM,
    letterSpacing: 1,
    marginTop: 2,
  },

  // --- findings headline (total at risk) ---
  lossHeadline: {
    marginTop: 6,
    marginBottom: 18,
    padding: 14,
    backgroundColor: RED,
  },
  lossHeadlineKicker: {
    fontFamily: MONO_BOLD,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 6,
  },
  lossHeadlineNum: {
    fontFamily: SANS_BOLD,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 1.1,
  },
  lossHeadlineNote: {
    fontFamily: MONO,
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 1.2,
    marginTop: 6,
    opacity: 0.9,
  },

  // --- per-finding cost line ---
  // NOTE: borderTopWidth at a page break triggers `clipBorderTop` NaN
  // in react-pdf when a finding spans a boundary. Use a sibling
  // divider View instead — filled rectangles paginate safely.
  findingCostDivider: {
    height: 1,
    backgroundColor: RULE,
    marginTop: 8,
    marginBottom: 6,
  },
  findingCost: {
    flexDirection: 'row',
    gap: 8,
  },
  findingCostLabel: {
    fontFamily: MONO_BOLD,
    fontSize: 10,
    color: RED,
    letterSpacing: 1.3,
  },
  findingCostValue: {
    fontFamily: SANS_BOLD,
    fontSize: 10,
    color: INK,
  },

  // --- before / after hero page ---
  baRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 12,
  },
  baCol: { flex: 1 },
  baTag: {
    fontFamily: MONO_BOLD,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  baTagBefore: { color: '#E53935' },
  baTagAfter: { color: '#1b8739' },
  baImg: {
    width: '100%',
    height: 230,
    objectFit: 'contain',
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: '#ffffff',
  },
  baCaption: {
    fontSize: 10,
    color: BODY,
    lineHeight: 1.5,
    marginTop: 6,
  },
  baBulletRow: {
    marginTop: 12,
    marginBottom: 4,
  },
  baBulletLabel: {
    fontFamily: MONO_BOLD,
    fontSize: 9,
    color: RED,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  baBullet: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.5,
    marginBottom: 4,
  },

  // --- trust page (risk reversal + scarcity + agency anchor) ---
  trustWrap: {
    marginTop: 10,
    marginBottom: 14,
  },
  trustHeader: {
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderBottomColor: RULE,
    paddingBottom: 8,
    marginBottom: 14,
  },
  trustTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 22,
    color: INK,
    letterSpacing: -0.3,
  },
  trustLead: {
    fontSize: 12,
    color: BODY,
    lineHeight: 1.55,
    marginBottom: 18,
  },
  trustCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  trustCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: INK,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  trustCardKicker: {
    fontFamily: MONO_BOLD,
    fontSize: 9,
    color: RED,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  trustCardTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 14,
    color: INK,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  trustCardBody: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.55,
  },
  trustAnchorRow: {
    marginTop: 10,
    padding: 14,
    backgroundColor: PAPER_SOFT,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: RED,
  },
  trustAnchorKicker: {
    fontFamily: MONO_BOLD,
    fontSize: 9,
    color: RED,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  trustAnchorNum: {
    fontFamily: SANS_BOLD,
    fontSize: 18,
    color: INK,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  trustAnchorNote: {
    fontFamily: MONO,
    fontSize: 10,
    color: DIM,
    letterSpacing: 1,
  },

  // --- CTA page additions ---
  ctaAnchorLine: {
    fontFamily: MONO,
    fontSize: 10,
    color: DIM,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  ctaQrRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  ctaQrImage: {
    width: 100,
    height: 100,
  },
  ctaQrCopy: { flex: 1 },
  ctaQrLabel: {
    fontFamily: MONO_BOLD,
    fontSize: 9,
    color: RED,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  ctaQrHint: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  ctaQrLinkSmall: {
    fontFamily: MONO,
    fontSize: 9,
    color: DIM,
    letterSpacing: 0.5,
  },

  // --- opportunities ---
  oppWrap: {
    marginTop: 10,
    marginBottom: 14,
  },
  oppIntro: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.55,
    marginBottom: 14,
  },
  opp: {
    marginBottom: 14,
    padding: 12,
    paddingLeft: 16,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: RED,
    backgroundColor: '#fffaf6',
  },
  oppPill: {
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
    fontFamily: MONO_BOLD,
    fontSize: 9,
    letterSpacing: 1.2,
    backgroundColor: RED,
    color: '#ffffff',
  },

  // --- current site (screenshots) ---
  shotsWrap: {
    marginTop: 6,
    marginBottom: 22,
  },
  shotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderBottomColor: RULE,
    paddingBottom: 6,
    marginBottom: 10,
  },
  shotsTitle: { fontFamily: SANS_BOLD, fontSize: 18, color: INK, letterSpacing: -0.3 },
  shotsMeta: { fontFamily: MONO, fontSize: 10, color: DIM, letterSpacing: 1.5 },
  // Full-page desktop: uses the full content width, objectFit:contain so
  // we show the whole capture without cropping.
  shotFullDesktop: {
    width: '100%',
    height: 560,
    objectFit: 'contain',
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  // Mobile page: centered, narrower, tall.
  shotFullMobileWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  shotFullMobile: {
    width: 260,
    height: 640,
    objectFit: 'contain',
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: '#ffffff',
  },
  shotCaption: {
    fontFamily: MONO,
    fontSize: 9,
    color: DIM,
    letterSpacing: 1.5,
    marginTop: 6,
    textAlign: 'center',
  },
  shotBody: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.55,
    marginTop: 12,
  },

  // --- technical health ---
  healthStrip: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  healthBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: INK,
    padding: 8,
    backgroundColor: '#ffffff',
  },
  healthLabel: {
    fontFamily: MONO_BOLD,
    fontSize: 8,
    color: DIM,
    letterSpacing: 1.3,
    marginBottom: 3,
  },
  healthValue: {
    fontFamily: SANS_BOLD,
    fontSize: 13,
    color: INK,
    letterSpacing: -0.2,
  },

  // --- portfolio strip ---
  portfolioWrap: {
    marginTop: 10,
    marginBottom: 14,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderBottomColor: RULE,
    paddingBottom: 6,
    marginBottom: 12,
  },
  portfolioTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 18,
    color: INK,
    letterSpacing: -0.3,
  },
  portfolioMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: DIM,
    letterSpacing: 1.5,
  },
  portfolioIntro: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.55,
    marginBottom: 12,
  },
  portfolioGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  projCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: '#ffffff',
  },
  projNameBlock: {
    width: 140,
  },
  projName: {
    fontFamily: SANS_BOLD,
    fontSize: 12,
    color: INK,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  projUrl: {
    fontFamily: MONO,
    fontSize: 9,
    color: RED,
    letterSpacing: 0.3,
  },
  projBody: { flex: 1 },
  projTagline: {
    fontFamily: SANS_BOLD,
    fontSize: 11,
    color: INK,
    marginBottom: 3,
    lineHeight: 1.35,
  },
  projOutcome: {
    fontSize: 10,
    color: BODY,
    lineHeight: 1.45,
  },

  // --- how we'd fix this ---
  howWrap: {
    marginTop: 18,
    marginBottom: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: '#ffffff',
  },
  howKicker: {
    fontFamily: MONO_BOLD,
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
    marginBottom: 8,
  },
  howTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 16,
    color: INK,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  stepNum: {
    fontFamily: MONO_BOLD,
    fontSize: 11,
    color: RED,
    width: 24,
    letterSpacing: 1,
  },
  stepBody: { flex: 1 },
  stepTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 12,
    color: INK,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  stepDetail: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.5,
  },

  // --- CTA ---
  ctaWrap: {
    marginTop: 8,
    padding: 18,
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: PAPER_SOFT,
  },
  ctaKicker: {
    fontFamily: MONO_BOLD,
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
    marginBottom: 8,
  },
  ctaTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 16,
    color: INK,
    marginBottom: 8,
    lineHeight: 1.2,
    letterSpacing: -0.3,
  },
  ctaPrice: {
    fontFamily: SANS_BOLD,
    fontSize: 22,
    color: RED,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  ctaBody: {
    fontSize: 11,
    color: BODY,
    lineHeight: 1.55,
    marginBottom: 10,
  },
  ctaBullets: {
    marginBottom: 12,
  },
  ctaBullet: {
    fontSize: 10,
    color: INK,
    lineHeight: 1.5,
    fontFamily: MONO,
    marginBottom: 2,
  },
  ctaLink: {
    fontFamily: MONO_BOLD,
    fontSize: 12,
    color: RED,
    letterSpacing: 0.5,
    marginTop: 4,
  },

  // --- footer ---
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: RULE,
    paddingTop: 8,
    fontSize: 9,
    color: DIM,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: MONO,
  },
  pageNum: { fontFamily: MONO },
});

interface PortfolioProject {
  name: string;
  url: string;
  displayUrl: string;
  tagline: string;
  outcome: string;
}

/** Subset of the homepage Portfolio projects, chosen for credibility in
 *  a cold-outreach PDF. Keeps the list in-file so the PDF renders
 *  serverless without filesystem reads. */
const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    name: 'ReachPilot',
    url: 'https://www.reachpilot.com.au',
    displayUrl: 'reachpilot.com.au',
    tagline: 'AI Social Media Scheduling + Marketing Automation',
    outcome: 'One AI writes posts across 9 platforms in your brand voice. Shipped Q1 2026.',
  },
  {
    name: 'SaaSValidatr',
    url: 'https://saasvalidatr.com',
    displayUrl: 'saasvalidatr.com',
    tagline: 'AI-Powered Idea Validation for Small Teams',
    outcome: 'Team vote + AI score in under 30 seconds. Production on Vercel + Neon.',
  },
  {
    name: 'SellMyOwnHome',
    url: 'https://sellmyownhome.ai',
    displayUrl: 'sellmyownhome.ai',
    tagline: 'AI For-Sale-By-Owner Platform (Australia)',
    outcome: 'Private property sales without the agent fee. FSBO compliance across every AU state.',
  },
  {
    name: 'Flat White Index',
    url: 'https://flatwhiteindex.com.au',
    displayUrl: 'flatwhiteindex.com.au',
    tagline: 'AI-Tracked Flat White Prices Across Sydney',
    outcome: 'An AI voice agent actually rings Sydney cafes to collect live prices.',
  },
  {
    name: 'Plant Planner',
    url: 'https://plantplanner.com.au',
    displayUrl: 'plantplanner.com.au',
    tagline: 'Free Vegetable Garden Planner for Australia',
    outcome: 'AI planting calendar for every Australian climate zone. Free forever.',
  },
  {
    name: 'Printforge CRM',
    url: 'https://crm.printforge.com.au',
    displayUrl: 'crm.printforge.com.au',
    tagline: 'Business Management Platform for 3D Print Shops',
    outcome: 'Quoting, job tracking, invoicing. Idea to live in 6 weeks. Runs daily.',
  },
];

export interface AuditPdfIssue {
  category: string;
  severity: string;
  title: string;
  detail: string;
  fix: string;
}

export interface AuditPdfOpportunity {
  category: string;
  title: string;
  detail: string;
  fix: string;
}

/**
 * What we pass to @react-pdf/renderer's <Image src>. Per the v4 docs, the
 * canonical server-side shape is `{ data: Buffer, format: 'jpg' }` — it
 * bypasses the base64 decode + format-sniff paths that crash on some
 * real-world JPEGs. Data-URI strings and raw Buffers also work.
 */
export type AuditPdfImageSrc =
  | string
  | Buffer
  | { data: Buffer; format: 'jpg' | 'png' }
  | null;

export interface AuditPdfArgs {
  url: string;
  businessName?: string | null;
  score: number;
  summary: string;
  issues: AuditPdfIssue[];
  opportunities?: AuditPdfOpportunity[];
  date: string;
  screenshotDesktop?: AuditPdfImageSrc;
  screenshotMobile?: AuditPdfImageSrc;
  brokenLinksCount?: number | null;
  viewportMetaOk?: boolean | null;
  copyrightYear?: number | null;
  /** Google Places types array for this prospect, used to pick the right
   *  average-job-value band for revenue impact. Falls back to 'default'. */
  placeTypes?: string[] | null;
  /** Mobile Lighthouse score (0-100) or null if not yet fetched. Renders
   *  in the page-1 stat strip. Phase D wires this through. */
  mobileSpeedScore?: number | null;
  /** Mockup preview screenshot (captured ScreenshotOne of /preview/[token]
   *  at 1440x900). Rendered as the "after" column on the before/after
   *  hero page. */
  mockupScreenshot?: AuditPdfImageSrc;
  /** Bisection flags. Gate individual page blocks at render time so the
   *  /diagnose route can pinpoint which one triggers the pdfkit number
   *  serialiser's NaN error. Leave undefined in production. */
  bisect?: PdfBisectFlags;
}

export interface PdfBisectFlags {
  skipStatStrip?: boolean;
  skipHealthStrip?: boolean;
  skipLossHeadline?: boolean;
  skipOpportunities?: boolean;
  skipTrustPage?: boolean;
  skipPortfolio?: boolean;
  skipCta?: boolean;
  skipShots?: boolean;
  skipFindings?: boolean;
}

function getSev(raw: string) {
  return SEVERITY[(raw ?? 'medium').toLowerCase()] ?? SEVERITY.medium;
}

function scoreBand(score: number): string {
  if (score >= 81) return 'Excellent. A few polish items below.';
  if (score >= 66) return 'Solid, with room to improve.';
  if (score >= 51) return 'Significant gaps. Worth fixing the top items below.';
  if (score >= 31) return 'Poor. The issues below are costing you leads every day.';
  return 'Critical. Most visitors will leave within seconds.';
}

function domainFromUrl(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/**
 * Split a detail paragraph into "first sentence" + "rest" so the PDF can
 * render the first sentence bold. First sentence = up to and including
 * the first period, question mark, or exclamation mark that is followed
 * by a space or end-of-string. Falls back to whole-string bold if we
 * can't find a terminator.
 */
function splitFirstSentence(raw: string): { head: string; tail: string } {
  const s = raw.trim();
  if (!s) return { head: '', tail: '' };
  const m = /^(.+?[.!?])(\s+)([\s\S]+)$/.exec(s);
  if (!m) return { head: s, tail: '' };
  return { head: m[1], tail: m[3] };
}

interface AuditDocumentInternalProps extends AuditPdfArgs {
  /** Data-URI string (data:image/png;base64,...) of the QR code for the
   *  booking URL. Data URIs render reliably in react-pdf; raw Buffers
   *  occasionally crash the fontkit/pdfkit pipeline with a silent
   *  process exit. */
  qrDataUri?: string | null;
}

function AuditDocument({
  url, businessName, score, summary, issues, opportunities, date,
  screenshotDesktop, screenshotMobile, mockupScreenshot,
  brokenLinksCount, viewportMetaOk, copyrightYear,
  placeTypes, mobileSpeedScore, qrDataUri, bisect,
}: AuditDocumentInternalProps) {
  const bx = bisect ?? {};
  const domain = domainFromUrl(url);
  const clampedScore = Math.max(0, Math.min(100, score));
  const hasShots = Boolean(screenshotDesktop || screenshotMobile);
  const vertical = resolveVertical(placeTypes);
  const totalLoss = estimateAuditTotal({ issues, vertical });
  const audFmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
  const hasHealth = brokenLinksCount !== null && brokenLinksCount !== undefined
    || viewportMetaOk !== null && viewportMetaOk !== undefined
    || copyrightYear !== null && copyrightYear !== undefined;

  return (
    <Document
      title={`Audit ${businessName ?? domain}`}
      author="Agentic Consciousness"
      subject="Website audit"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar} fixed>
          <Text style={styles.brandMark}>AGENTIC CONSCIOUSNESS_</Text>
          <Text style={styles.brandKicker}>WEBSITE AUDIT</Text>
        </View>

        <Text style={styles.coverKicker}>PREPARED FOR</Text>
        <Text style={styles.coverTitle}>{stripDashes(businessName || domain)}</Text>
        <Text style={styles.coverUrl}>{url}</Text>

        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>OVERALL</Text>
            <Text style={styles.scoreNumber}>{clampedScore}</Text>
            <Text style={styles.scoreOutOf}>OUT OF 100</Text>
          </View>
          <Text style={styles.scoreBand}>{scoreBand(clampedScore)}</Text>
        </View>

        {summary ? (
          <View style={styles.glanceWrap}>
            <Text style={styles.glanceKicker}>AT A GLANCE</Text>
            <Text style={styles.glanceBody}>{stripDashes(summary)}</Text>
          </View>
        ) : null}

        {/* Four headline numbers: score, mobile speed, estimated loss, sprint price. */}
        {!bx.skipStatStrip ? (
          <View style={styles.statStrip}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>OVERALL SCORE</Text>
              <Text style={styles.statValue}>{clampedScore}</Text>
              <Text style={styles.statSub}>OUT OF 100</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>MOBILE SPEED</Text>
              <Text style={styles.statValue}>
                {mobileSpeedScore !== null && mobileSpeedScore !== undefined ? mobileSpeedScore : 'TBD'}
              </Text>
              <Text style={styles.statSub}>LIGHTHOUSE / MOBILE</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>EST. ANNUAL LOSS</Text>
              <Text style={totalLoss ? styles.statValueSmall : styles.statValue}>
                {totalLoss ? formatRevenueRange(totalLoss) : 'N/A'}
              </Text>
              <Text style={styles.statSub}>AT CURRENT STATE</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>SPRINT PRICE</Text>
              <Text style={styles.statValue}>{audFmt.format(SPRINT_CONFIG.priceAud)}</Text>
              <Text style={styles.statSub}>FIXED / 48 HOURS</Text>
            </View>
          </View>
        ) : null}

        {hasHealth && !bx.skipHealthStrip ? (
          <View style={styles.healthStrip}>
            {brokenLinksCount !== null && brokenLinksCount !== undefined ? (
              <View style={styles.healthBox}>
                <Text style={styles.healthLabel}>BROKEN LINKS</Text>
                <Text style={[styles.healthValue, { color: brokenLinksCount > 0 ? '#E53935' : INK }]}>
                  {brokenLinksCount}
                </Text>
              </View>
            ) : null}
            {viewportMetaOk !== null && viewportMetaOk !== undefined ? (
              <View style={styles.healthBox}>
                <Text style={styles.healthLabel}>MOBILE VIEWPORT</Text>
                <Text style={[styles.healthValue, { color: viewportMetaOk ? '#1b8739' : '#E53935' }]}>
                  {viewportMetaOk ? 'OK' : 'MISSING'}
                </Text>
              </View>
            ) : null}
            {copyrightYear !== null && copyrightYear !== undefined ? (
              <View style={styles.healthBox}>
                <Text style={styles.healthLabel}>COPYRIGHT YEAR</Text>
                <Text style={[
                  styles.healthValue,
                  { color: copyrightYear < new Date().getUTCFullYear() ? '#E53935' : INK },
                ]}>
                  {copyrightYear}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>Agentic Consciousness / agenticconsciousness.com.au / {date}</Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>

      {screenshotDesktop && !bx.skipShots ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.brandBar} fixed>
            <Text style={styles.brandMark}>AGENTIC CONSCIOUSNESS_</Text>
            <Text style={styles.brandKicker}>WEBSITE AUDIT</Text>
          </View>

          <View style={styles.shotsWrap}>
            <View style={styles.shotsHeader}>
              <Text style={styles.shotsTitle}>Your site, right now</Text>
              <Text style={styles.shotsMeta}>DESKTOP</Text>
            </View>
            <Image src={screenshotDesktop} style={styles.shotFullDesktop} />
            <Text style={styles.shotCaption}>DESKTOP 1440 x 900 / FULL CAPTURE, UNCROPPED</Text>
            <Text style={styles.shotBody}>
              This is what a new visitor sees on desktop. The findings on
              the pages ahead map directly back to what is shown here:
              layout, hierarchy, trust signals, calls to action, and
              above-the-fold value proposition.
            </Text>
          </View>

          <View style={styles.footer} fixed>
            <Text>Agentic Consciousness / agenticconsciousness.com.au / {date}</Text>
            <Text
              style={styles.pageNum}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </Page>
      ) : null}

      {screenshotMobile && !bx.skipShots ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.brandBar} fixed>
            <Text style={styles.brandMark}>AGENTIC CONSCIOUSNESS_</Text>
            <Text style={styles.brandKicker}>WEBSITE AUDIT</Text>
          </View>

          <View style={styles.shotsWrap}>
            <View style={styles.shotsHeader}>
              <Text style={styles.shotsTitle}>Your site, right now</Text>
              <Text style={styles.shotsMeta}>MOBILE</Text>
            </View>
            <View style={styles.shotFullMobileWrap}>
              <Image src={screenshotMobile} style={styles.shotFullMobile} />
              <Text style={styles.shotCaption}>MOBILE 393 x 852 / FULL CAPTURE, UNCROPPED</Text>
            </View>
            <Text style={styles.shotBody}>
              Over 70 percent of local search traffic is mobile. If the
              experience here is cramped, slow, or the phone number is
              not a tap-to-call link, you are losing the majority of
              your leads before they ever see the copy.
            </Text>
          </View>

          <View style={styles.footer} fixed>
            <Text>Agentic Consciousness / agenticconsciousness.com.au / {date}</Text>
            <Text
              style={styles.pageNum}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </Page>
      ) : null}

      {/* Before / After hero: contrasts the prospect's current hero
          against the mockup we generated for them. Renders only when
          BOTH screenshots exist (otherwise it would look half-baked). */}
      {screenshotDesktop && mockupScreenshot ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.brandBar} fixed>
            <Text style={styles.brandMark}>AGENTIC CONSCIOUSNESS_</Text>
            <Text style={styles.brandKicker}>WEBSITE AUDIT</Text>
          </View>

          <View style={styles.shotsHeader}>
            <Text style={styles.shotsTitle}>Before / After</Text>
            <Text style={styles.shotsMeta}>YOUR HERO vs WHAT WE WOULD SHIP</Text>
          </View>

          <View style={styles.baRow}>
            <View style={styles.baCol}>
              <Text style={[styles.baTag, styles.baTagBefore]}>BEFORE</Text>
              <Image src={screenshotDesktop} style={styles.baImg} />
              <Text style={styles.baCaption}>
                Your current homepage at desktop width. This is the exact
                first impression any new visitor gets.
              </Text>
            </View>
            <View style={styles.baCol}>
              <Text style={[styles.baTag, styles.baTagAfter]}>AFTER</Text>
              <Image src={mockupScreenshot} style={styles.baImg} />
              <Text style={styles.baCaption}>
                A mockup of your site rebuilt with the fixes in this audit.
                Open the same page live at {SPRINT_CONFIG.bookingUrl.replace('/book', '')}/preview/...
              </Text>
            </View>
          </View>

          <View style={styles.baBulletRow}>
            <Text style={styles.baBulletLabel}>WHAT CHANGED</Text>
            <Text style={styles.baBullet}>+ Specific headline (who you are, who you serve, where you serve them)</Text>
            <Text style={styles.baBullet}>+ Two distinct calls to action side by side: tap-to-call and book online</Text>
            <Text style={styles.baBullet}>+ Trust row immediately below the hero: licensed, insured, Google rating</Text>
            <Text style={styles.baBullet}>+ Real photos from your site, not stock imagery</Text>
            <Text style={styles.baBullet}>+ Mobile sticky CTA that stays visible while scrolling</Text>
            <Text style={styles.baBullet}>+ Structured data (LocalBusiness + FAQ JSON-LD) so AI search engines cite you</Text>
          </View>

          <View style={styles.footer} fixed>
            <Text>Agentic Consciousness / agenticconsciousness.com.au / {date}</Text>
            <Text
              style={styles.pageNum}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
        </Page>
      ) : null}

      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar} fixed>
          <Text style={styles.brandMark}>AGENTIC CONSCIOUSNESS_</Text>
          <Text style={styles.brandKicker}>WEBSITE AUDIT</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Findings</Text>
          <Text style={styles.sectionMeta}>
            {issues.length} ITEM{issues.length === 1 ? '' : 'S'} / ORDERED BY SEVERITY
          </Text>
        </View>

        {totalLoss && !bx.skipLossHeadline ? (
          <View style={styles.lossHeadline}>
            <Text style={styles.lossHeadlineKicker}>ESTIMATED ANNUAL REVENUE LOSS</Text>
            <Text style={styles.lossHeadlineNum}>{formatRevenueRange(totalLoss)}</Text>
            <Text style={styles.lossHeadlineNote}>
              CONSERVATIVE MODEL, {(AVG_JOB_VALUE_BY_VERTICAL[vertical] ?? AVG_JOB_VALUE_BY_VERTICAL.default).toLocaleString('en-AU')} AVG JOB VALUE /
              CRITICAL + HIGH FINDINGS ONLY
            </Text>
          </View>
        ) : null}

        {!bx.skipFindings && issues.map((issue, i) => {
          const sev = getSev(issue.severity);
          // Wrap=false guarantees no finding splits across a page.
          // Every 5th finding forces a break so pagination happens at a
          // predictable, page-aligned boundary (prevents the floating
          // page-fit recalc that produces -1.87e21 NaN).
          // Break every 4 findings: deterministic pagination at page-aligned
          // boundaries. Avoids the wrap=false pressure that reliably trips
          // the pdfkit -1.87e21 NaN when a 9th finding can't fit.
          const forceBreak = i > 0 && i % 4 === 0;
          return (
            <View
              key={i}
              break={forceBreak}
              style={[styles.findingWrap, { backgroundColor: sev.accent }]}
            >
              <View style={styles.findingMetaRow}>
                <Text style={[styles.findingNumber, { color: sev.border }]}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.severityPill, { backgroundColor: sev.chipBg, color: sev.chipFg }]}>
                  {sev.label}
                </Text>
                <Text style={styles.categoryPill}>
                  / {(issue.category || 'General').toUpperCase()}
                </Text>
              </View>

              <Text style={styles.findingTitle}>{stripDashes(issue.title)}</Text>

              {(() => {
                const { head, tail } = splitFirstSentence(stripDashes(issue.detail));
                return (
                  <View style={styles.labelBlock}>
                    <Text style={styles.blockLabel}>WHAT WE FOUND</Text>
                    <Text style={styles.blockBody}>
                      <Text style={styles.blockBodyBold}>{head}</Text>
                      {tail ? ' ' + tail : ''}
                    </Text>
                  </View>
                );
              })()}

              {issue.fix ? (
                <View style={styles.labelBlockLast}>
                  <Text style={styles.blockLabel}>WHAT TO DO</Text>
                  <Text style={styles.blockBody}>{stripDashes(issue.fix)}</Text>
                </View>
              ) : null}

              {(() => {
                // Every finding renders the same bottom strip. Legal and
                // low-severity findings show a compliance note instead of
                // a dollar range. Skipping the block on some findings but
                // not others triggers a pdfkit NaN when wrap=false cards
                // of different heights paginate next to each other.
                const est = estimateFindingLoss({ category: issue.category, severity: issue.severity, vertical });
                const sevLower = (issue.severity ?? '').toLowerCase();
                const label = est
                  ? 'EST. ANNUAL COST'
                  : sevLower === 'legal'
                    ? 'COMPLIANCE RISK'
                    : 'IMPACT';
                const value = est
                  ? formatRevenueRange(est)
                  : sevLower === 'legal'
                    ? 'WCAG / ACCESSIBILITY'
                    : 'NOT PRICED';
                return (
                  <View>
                    <View style={styles.findingCostDivider} />
                    <View style={styles.findingCost}>
                      <Text style={styles.findingCostLabel}>{label}</Text>
                      <Text style={styles.findingCostValue}>{value}</Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          );
        })}

        {/* Opportunities: AI-category items promoted out of Findings.
            Renders on its own page only when the audit surfaced any. */}
        {opportunities && opportunities.length > 0 && !bx.skipOpportunities ? (
          <View style={styles.oppWrap} break>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Opportunities</Text>
              <Text style={styles.sectionMeta}>UPSIDE / NOT PROBLEMS</Text>
            </View>
            <Text style={styles.oppIntro}>
              Unlike the findings above, these are not issues with your site
              as it stands. They are upgrades that would move the needle on
              leads, speed, or customer experience if you chose to add them.
            </Text>
            {opportunities.map((opp, i) => (
              <View key={i} style={styles.opp}>
                <View style={styles.findingMetaRow}>
                  <Text style={[styles.findingNumber, { color: RED }]}>
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                  <Text style={styles.oppPill}>OPPORTUNITY</Text>
                  <Text style={styles.categoryPill}>
                    / {(opp.category || 'AI').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.findingTitle}>{stripDashes(opp.title)}</Text>
                {(() => {
                  const { head, tail } = splitFirstSentence(stripDashes(opp.detail));
                  return (
                    <View style={styles.labelBlock}>
                      <Text style={styles.blockLabel}>WHAT IT IS</Text>
                      <Text style={styles.blockBody}>
                        <Text style={styles.blockBodyBold}>{head}</Text>
                        {tail ? ' ' + tail : ''}
                      </Text>
                    </View>
                  );
                })()}
                {opp.fix ? (
                  <View style={styles.labelBlockLast}>
                    <Text style={styles.blockLabel}>HOW WE&apos;D ADD IT</Text>
                    <Text style={styles.blockBody}>{stripDashes(opp.fix)}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Trust page: risk reversal + scarcity + agency anchor. Forced
            onto its own page. Testimonials render only when the config
            array has real entries (never fabricated). */}
        {!bx.skipTrustPage ? (
        <View style={styles.trustWrap} break>
          <View style={styles.trustHeader}>
            <Text style={styles.trustTitle}>Why trust us with this</Text>
          </View>
          <Text style={styles.trustLead}>
            A $999 rebuild is only a good deal if we actually deliver. Here
            is how we make sure you do not carry the risk.
          </Text>

          <View style={styles.trustCardRow}>
            <View style={styles.trustCard}>
              <Text style={styles.trustCardKicker}>RISK REVERSAL</Text>
              <Text style={styles.trustCardTitle}>We do not invoice until you sign off on the live site.</Text>
              <Text style={styles.trustCardBody}>
                You pay on delivery, not before. If the 48-hour rebuild
                does not land on time, money back and you keep whatever
                is finished.
              </Text>
            </View>
            <View style={styles.trustCard}>
              <Text style={styles.trustCardKicker}>SCARCITY (HONEST)</Text>
              <Text style={styles.trustCardTitle}>
                {SPRINT_CONFIG.monthlyCapacity} sprints per month.
                {' '}
                {SPRINT_CONFIG.remainingThisMonth} remaining this month.
              </Text>
              <Text style={styles.trustCardBody}>
                The 48-hour promise only works with protected calendar
                space. When the slots are gone, you go on the waitlist
                for next month. No upsells, no "premium tier".
              </Text>
            </View>
          </View>

          {SPRINT_CONFIG.testimonials.length > 0 ? (
            <View style={styles.trustCardRow}>
              {SPRINT_CONFIG.testimonials.slice(0, 2).map((t, i) => (
                <View key={i} style={styles.trustCard}>
                  <Text style={styles.trustCardKicker}>TESTIMONIAL</Text>
                  <Text style={styles.trustCardBody}>
                    &quot;{stripDashes(t.quote)}&quot;
                  </Text>
                  <Text style={[styles.trustCardBody, { marginTop: 8, fontFamily: SANS_BOLD }]}>
                    {stripDashes(t.author)}
                  </Text>
                  <Text style={[styles.trustCardBody, { fontSize: 10, color: DIM }]}>
                    {stripDashes(t.role)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.trustAnchorRow}>
            <Text style={styles.trustAnchorKicker}>PRICE ANCHOR</Text>
            <Text style={styles.trustAnchorNum}>
              {audFmt.format(SPRINT_CONFIG.agencyAnchor.lowAud)} to {audFmt.format(SPRINT_CONFIG.agencyAnchor.highAud)}
            </Text>
            <Text style={styles.trustAnchorNote}>
              TYPICAL LOCAL AGENCY QUOTE / {SPRINT_CONFIG.agencyAnchor.weeksLow} TO {SPRINT_CONFIG.agencyAnchor.weeksHigh} WEEKS
            </Text>
          </View>

          <View style={styles.trustAnchorRow}>
            <Text style={styles.trustAnchorKicker}>OUR PRICE</Text>
            <Text style={styles.trustAnchorNum}>
              {audFmt.format(SPRINT_CONFIG.priceAud)}
            </Text>
            <Text style={styles.trustAnchorNote}>
              FIXED PRICE / 48 HOURS / EVERYTHING INCLUDED
            </Text>
          </View>

          <View style={styles.trustAnchorRow}>
            <Text style={styles.trustAnchorKicker}>OUR GUARANTEE</Text>
            <Text style={styles.trustAnchorNum}>
              Money back if we miss 48 hours
            </Text>
            <Text style={styles.trustAnchorNote}>
              YOU KEEP EVERYTHING WE SHIPPED / NO QUESTIONS
            </Text>
          </View>
        </View>
        ) : null}

        {/* Selected recent work, forced onto its own page */}
        {!bx.skipPortfolio ? (
        <View style={styles.portfolioWrap} break>
          <View style={styles.portfolioHeader}>
            <Text style={styles.portfolioTitle}>Selected recent work</Text>
            <Text style={styles.portfolioMeta}>LIVE PRODUCTS / SHIPPED BY US</Text>
          </View>
          <Text style={styles.portfolioIntro}>
            Most consultants have slide decks. These are working apps you can
            click through right now.
          </Text>
          <View style={styles.portfolioGrid}>
            {PORTFOLIO_PROJECTS.map((p) => (
              <View key={p.url} style={styles.projCard}>
                <View style={styles.projNameBlock}>
                  <Text style={styles.projName}>{p.name}</Text>
                  <Text style={styles.projUrl}>{p.displayUrl}</Text>
                </View>
                <View style={styles.projBody}>
                  <Text style={styles.projTagline}>{stripDashes(p.tagline)}</Text>
                  <Text style={styles.projOutcome}>{stripDashes(p.outcome)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        ) : null}

        {/* How we'd fix this */}
        <View style={styles.howWrap} wrap={false}>
          <Text style={styles.howKicker}>HOW WE'D FIX THIS FOR YOU</Text>
          <Text style={styles.howTitle}>Six steps. Forty-eight hours. Done.</Text>

          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>01</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>30-minute discovery call</Text>
              <Text style={styles.stepDetail}>
                We jump on a video call so we understand your customers, your
                offer, and the two or three things you want prospects to do.
                You brief us, we take notes. No deck, no forms.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>02</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Content + brand handoff</Text>
              <Text style={styles.stepDetail}>
                You send logo, photos, service list, and any testimonials you
                have. If you are missing any of it, we write it or generate it
                for you. We do not wait on you to get unstuck.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>03</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Day 1: rebuild (hours 0 to 24)</Text>
              <Text style={styles.stepDetail}>
                Fresh site, mobile-first layout, every issue in this audit
                resolved. Core Web Vitals tuned, structured data wired,
                Open Graph cards set, accessibility passed.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>04</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Day 2: AI + polish (hours 24 to 48)</Text>
              <Text style={styles.stepDetail}>
                Claude chatbot trained on your services and pricing so
                prospects get answers at 11pm. Lead capture wired into your
                inbox. Analytics in. Final QA pass.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>05</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Launch + handover</Text>
              <Text style={styles.stepDetail}>
                We flip the DNS, you sign off. You get a one-page
                cheat-sheet with how to update copy, swap images, and
                what to watch. If something breaks in the first 48 hours,
                money back.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>06</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>12 months of maintenance, included</Text>
              <Text style={styles.stepDetail}>
                Monthly copy tweaks and image swaps on request.
                Security patches, plugin updates, uptime monitoring,
                backups. If you need a new page we build it.
                No surprise invoices.
              </Text>
            </View>
          </View>
        </View>

        {!bx.skipCta ? (
        <View style={styles.ctaWrap} wrap={false}>
          <Text style={styles.ctaKicker}>NEXT STEP</Text>
          <Text style={styles.ctaTitle}>Fix every one of these in 48 hours.</Text>
          <Text style={styles.ctaAnchorLine}>
            TYPICAL LOCAL AGENCY QUOTE: {audFmt.format(SPRINT_CONFIG.agencyAnchor.lowAud)} TO {audFmt.format(SPRINT_CONFIG.agencyAnchor.highAud)} / {SPRINT_CONFIG.agencyAnchor.weeksLow} TO {SPRINT_CONFIG.agencyAnchor.weeksHigh} WEEKS
          </Text>
          <Text style={styles.ctaPrice}>{audFmt.format(SPRINT_CONFIG.priceAud)}</Text>
          <Text style={styles.ctaBody}>
            Lightning Website Sprint. Mobile-first rebuild, AI-optimised,
            Claude chatbot trained on your content, Core Web Vitals tuned.
            Money-back guarantee if it is not live in 48 hours.
          </Text>
          <View style={styles.ctaBullets}>
            <Text style={styles.ctaBullet}>+ FULL 12 MONTH MAINTENANCE INCLUDED</Text>
            <Text style={styles.ctaBullet}>+ COPY TWEAKS + IMAGE SWAPS ON REQUEST</Text>
            <Text style={styles.ctaBullet}>+ SECURITY PATCHES + UPTIME MONITORING</Text>
            <Text style={styles.ctaBullet}>+ HOSTING + DOMAIN MANAGEMENT</Text>
          </View>

          {qrDataUri ? (
            <View style={styles.ctaQrRow}>
              <Image src={qrDataUri} style={styles.ctaQrImage} />
              <View style={styles.ctaQrCopy}>
                <Text style={styles.ctaQrLabel}>SCAN TO BOOK</Text>
                <Text style={styles.ctaQrHint}>
                  Point your phone camera at the code. Opens the booking
                  page in one tap, pre-filled with this audit.
                </Text>
                <Text style={styles.ctaQrLinkSmall}>{SPRINT_CONFIG.bookingUrl}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.ctaLink}>AGENTICCONSCIOUSNESS.COM.AU/BOOK</Text>
          )}
        </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>Agentic Consciousness / agenticconsciousness.com.au / {date}</Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderAuditPdf(args: AuditPdfArgs): Promise<Buffer> {
  // Generate the QR code for the booking URL as a PNG Buffer BEFORE
  // calling react-pdf. QRCode.toBuffer is async and react-pdf component
  // rendering is synchronous, so we can't do this inside AuditDocument.
  // Any failure is non-fatal — the PDF falls back to the plain URL link.
  let qrDataUri: string | null = null;
  try {
    // Data URI (data:image/png;base64,...) rather than raw Buffer — the
    // string path is the one we know renders reliably on Vercel. Buffer
    // PNGs caused silent process crashes during render (no catchable
    // error, just a 500 with no log trail).
    qrDataUri = await QRCode.toDataURL(SPRINT_CONFIG.bookingUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 400,
      color: { dark: '#0a0a0a', light: '#ffffff' },
    });
  } catch (err) {
    console.error('[pdf] QR generation failed, falling back to URL only:', err instanceof Error ? err.message : err);
  }
  return await renderToBuffer(<AuditDocument {...args} qrDataUri={qrDataUri} />);
}
