import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { stripDashes } from '@/lib/text-hygiene';

/**
 * Audit PDF. Neural brutalist aesthetic: pure #000 on #fff, hard severity
 * colours, heavy monospace kickers, score as hero on page one.
 *
 * House rules enforced:
 *   - No em/en dashes anywhere. Text is run through stripDashes on entry.
 *   - No fancy arrows. "->" is used.
 *   - No hardcoded year. scoreBand / CTA reference runtime date only.
 *   - Score calibration: 0-30 critical, 31-50 poor, 51-65 gaps,
 *     66-80 solid, 81-100 excellent.
 */

const BLACK = '#000000';
const WHITE = '#ffffff';
const DIM = '#555555';
const RULE = '#000000';

const SEVERITY: Record<string, { bg: string; fg: string; label: string }> = {
  critical: { bg: '#E53935', fg: '#ffffff', label: 'CRITICAL' },
  high:     { bg: '#FB8C00', fg: '#ffffff', label: 'HIGH' },
  medium:   { bg: '#FDD835', fg: '#000000', label: 'MEDIUM' },
  low:      { bg: '#757575', fg: '#ffffff', label: 'LOW' },
};

const MONO = 'Courier';
const MONO_BOLD = 'Courier-Bold';
const SANS = 'Helvetica';
const SANS_BOLD = 'Helvetica-Bold';

const styles = StyleSheet.create({
  // --- page shell ---
  page: {
    padding: 48,
    paddingBottom: 56,
    fontSize: 11,
    color: BLACK,
    backgroundColor: WHITE,
    fontFamily: SANS,
    lineHeight: 1.5,
  },

  // --- brand bar (every page) ---
  brandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: BLACK,
    paddingBottom: 10,
    marginBottom: 28,
  },
  brandMark: {
    fontFamily: MONO_BOLD,
    fontSize: 11,
    color: BLACK,
    letterSpacing: 1,
  },
  brandKicker: {
    fontFamily: MONO,
    fontSize: 10,
    color: BLACK,
    letterSpacing: 2,
  },

  // --- cover ---
  coverKicker: {
    fontFamily: MONO,
    fontSize: 10,
    color: BLACK,
    letterSpacing: 2,
    marginBottom: 8,
  },
  coverTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 32,
    color: BLACK,
    lineHeight: 1.05,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  coverUrl: {
    fontFamily: MONO,
    fontSize: 11,
    color: BLACK,
    marginBottom: 28,
  },

  // --- score block (hero) ---
  scoreWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    gap: 20,
  },
  scoreNumber: {
    fontFamily: SANS_BOLD,
    fontSize: 96,
    color: BLACK,
    lineHeight: 0.95,
    letterSpacing: -3,
  },
  scoreSuffix: {
    fontFamily: MONO,
    fontSize: 12,
    color: BLACK,
    letterSpacing: 1,
    marginBottom: 14,
  },
  scoreBand: {
    fontFamily: SANS_BOLD,
    fontSize: 13,
    color: BLACK,
    letterSpacing: 0,
    marginBottom: 22,
    textTransform: 'uppercase',
    lineHeight: 1.3,
  },

  // --- at a glance ---
  glanceWrap: {
    borderLeftWidth: 3,
    borderLeftColor: BLACK,
    paddingLeft: 14,
    paddingVertical: 2,
    marginBottom: 30,
  },
  glanceKicker: {
    fontFamily: MONO,
    fontSize: 9,
    color: BLACK,
    letterSpacing: 2,
    marginBottom: 6,
  },
  glanceBody: {
    fontSize: 11,
    color: BLACK,
    lineHeight: 1.6,
  },

  // --- findings section ---
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 2,
    borderBottomColor: BLACK,
    paddingBottom: 6,
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 18,
    color: BLACK,
    letterSpacing: -0.3,
  },
  sectionMeta: {
    fontFamily: MONO,
    fontSize: 9,
    color: BLACK,
    letterSpacing: 2,
  },

  // --- individual finding ---
  finding: {
    marginBottom: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  findingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  findingNumber: {
    fontFamily: MONO_BOLD,
    fontSize: 11,
    color: BLACK,
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
    fontSize: 14,
    color: BLACK,
    lineHeight: 1.25,
    marginBottom: 10,
    letterSpacing: -0.2,
  },

  // labelled blocks — WHAT WE FOUND / WHAT TO DO
  labelBlock: {
    marginBottom: 8,
  },
  labelBlockLast: {
    marginBottom: 0,
  },
  blockLabel: {
    fontFamily: MONO_BOLD,
    fontSize: 9,
    color: BLACK,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  blockBody: {
    fontSize: 11,
    color: BLACK,
    lineHeight: 1.55,
  },
  blockBodyMono: {
    fontSize: 10,
    color: BLACK,
    lineHeight: 1.55,
    fontFamily: MONO,
  },

  // --- CTA ---
  ctaWrap: {
    marginTop: 8,
    padding: 18,
    borderWidth: 2,
    borderColor: BLACK,
  },
  ctaKicker: {
    fontFamily: MONO,
    fontSize: 10,
    color: BLACK,
    letterSpacing: 2,
    marginBottom: 10,
  },
  ctaTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 16,
    color: BLACK,
    marginBottom: 10,
    lineHeight: 1.2,
    letterSpacing: -0.3,
  },
  ctaBody: {
    fontSize: 11,
    color: BLACK,
    lineHeight: 1.55,
    marginBottom: 10,
  },
  ctaBullets: {
    marginBottom: 12,
  },
  ctaBullet: {
    fontSize: 10,
    color: BLACK,
    lineHeight: 1.45,
    fontFamily: MONO,
    marginBottom: 3,
  },
  ctaPrice: {
    fontFamily: SANS_BOLD,
    fontSize: 22,
    color: BLACK,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  ctaLink: {
    fontFamily: MONO_BOLD,
    fontSize: 12,
    color: BLACK,
    letterSpacing: 0.5,
    marginTop: 4,
  },

  // --- footer ---
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 8,
    fontSize: 9,
    color: BLACK,
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

/**
 * Rescaled per Daniel's brief.
 * 0-30 critical  | 31-50 poor  | 51-65 significant gaps
 * 66-80 solid    | 81-100 excellent
 */
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
        {/* Brand bar */}
        <View style={styles.brandBar} fixed>
          <Text style={styles.brandMark}>AGENTIC CONSCIOUSNESS_</Text>
          <Text style={styles.brandKicker}>WEBSITE AUDIT</Text>
        </View>

        {/* Cover block */}
        <Text style={styles.coverKicker}>PREPARED FOR</Text>
        <Text style={styles.coverTitle}>
          {stripDashes(businessName || domain)}
        </Text>
        <Text style={styles.coverUrl}>{url}</Text>

        {/* Hero score */}
        <View style={styles.scoreWrap}>
          <Text style={styles.scoreNumber}>{clampedScore}</Text>
          <Text style={styles.scoreSuffix}>OUT OF 100</Text>
        </View>
        <Text style={styles.scoreBand}>{scoreBand(clampedScore)}</Text>

        {/* At a glance */}
        {summary ? (
          <View style={styles.glanceWrap}>
            <Text style={styles.glanceKicker}>AT A GLANCE</Text>
            <Text style={styles.glanceBody}>{stripDashes(summary)}</Text>
          </View>
        ) : null}

        {/* Findings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Findings</Text>
          <Text style={styles.sectionMeta}>
            {issues.length} ITEM{issues.length === 1 ? '' : 'S'} / ORDERED BY SEVERITY
          </Text>
        </View>

        {issues.map((issue, i) => {
          const sev = getSev(issue.severity);
          return (
            <View key={i} style={styles.finding} wrap={false}>
              <View style={styles.findingMetaRow}>
                <Text style={styles.findingNumber}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.severityPill, { backgroundColor: sev.bg, color: sev.fg }]}>
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

        {/* CTA */}
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

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Agentic Consciousness / agenticconsciousness.com.au / {date}
          </Text>
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
