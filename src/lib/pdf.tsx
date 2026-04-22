import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { stripDashes } from '@/lib/text-hygiene';

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
    borderBottomWidth: 2,
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
    borderBottomWidth: 1,
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
  finding: {
    marginBottom: 14,
    padding: 12,
    paddingLeft: 16,
    borderLeftWidth: 4,
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

export interface AuditPdfIssue {
  category: string;
  severity: string;
  title: string;
  detail: string;
  fix: string;
}

export interface AuditPdfArgs {
  url: string;
  businessName?: string | null;
  score: number;
  summary: string;
  issues: AuditPdfIssue[];
  date: string;
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

function AuditDocument({ url, businessName, score, summary, issues, date }: AuditPdfArgs) {
  const domain = domainFromUrl(url);
  const clampedScore = Math.max(0, Math.min(100, score));

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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Findings</Text>
          <Text style={styles.sectionMeta}>
            {issues.length} ITEM{issues.length === 1 ? '' : 'S'} / ORDERED BY SEVERITY
          </Text>
        </View>

        {issues.map((issue, i) => {
          const sev = getSev(issue.severity);
          return (
            <View
              key={i}
              style={[
                styles.finding,
                { borderLeftColor: sev.border, backgroundColor: sev.accent },
              ]}
              wrap={false}
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

              <View style={styles.labelBlock}>
                <Text style={styles.blockLabel}>WHAT WE FOUND</Text>
                <Text style={styles.blockBody}>{stripDashes(issue.detail)}</Text>
              </View>

              {issue.fix ? (
                <View style={styles.labelBlockLast}>
                  <Text style={styles.blockLabel}>WHAT TO DO</Text>
                  <Text style={styles.blockBody}>{stripDashes(issue.fix)}</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={styles.ctaWrap} wrap={false}>
          <Text style={styles.ctaKicker}>NEXT STEP</Text>
          <Text style={styles.ctaTitle}>Fix every one of these in 48 hours.</Text>
          <Text style={styles.ctaPrice}>$999</Text>
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
          <Text style={styles.ctaLink}>AGENTICCONSCIOUSNESS.COM.AU/BOOK</Text>
        </View>

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
  return await renderToBuffer(<AuditDocument {...args} />);
}
