import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

/**
 * Audit PDF — mirrors the email-template aesthetic (red brand accents,
 * heavy-display headlines, monospace labels) in PDF form using
 * @react-pdf/renderer. Pure JS, no Chromium.
 *
 * Kept intentionally simple: no external fonts (uses built-in Helvetica
 * and Courier) so cold starts stay cheap.
 */

const RED = '#ff3d00';
const INK = '#0a0a0a';
const BODY = '#1f1f1f';
const DIM = '#666666';
const RULE = '#dddddd';
const BG_SOFT = '#f6f4f2';

const SEVERITY: Record<string, { bg: string; fg: string; label: string }> = {
  critical: { bg: '#ff3d00', fg: '#ffffff', label: 'CRITICAL' },
  high:     { bg: '#d97706', fg: '#ffffff', label: 'HIGH' },
  medium:   { bg: '#eab308', fg: '#0a0a0a', label: 'MEDIUM' },
  low:      { bg: '#e5e7eb', fg: '#1f2937', label: 'LOW' },
};

const styles = StyleSheet.create({
  page: {
    padding: 44,
    paddingBottom: 60,
    fontSize: 11,
    color: BODY,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },
  // --- header bar ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: RED,
    paddingBottom: 10,
    marginBottom: 22,
  },
  brand: { flexDirection: 'row', alignItems: 'baseline' },
  brandText: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: 0.3 },
  brandDot: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: RED },
  kicker: { fontFamily: 'Courier', fontSize: 8, color: RED, letterSpacing: 2 },

  // --- cover block ---
  kickerLabel: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: RED,
    letterSpacing: 2,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 8,
    lineHeight: 1.15,
  },
  url: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: RED,
    marginBottom: 18,
  },

  scoreRow: { flexDirection: 'row', marginBottom: 18, gap: 12 },
  scoreBox: {
    borderWidth: 2,
    borderColor: RED,
    padding: 12,
    width: 100,
  },
  scoreLabel: {
    fontFamily: 'Courier',
    fontSize: 7,
    color: RED,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    lineHeight: 1,
  },
  scoreOutOf: { fontFamily: 'Courier', fontSize: 9, color: DIM, marginTop: 2 },
  scoreSummary: { flex: 1, padding: 4, justifyContent: 'center' },
  scoreSummaryText: { fontSize: 11, color: BODY, lineHeight: 1.55 },

  // --- what this is ---
  intro: {
    padding: 12,
    backgroundColor: BG_SOFT,
    marginBottom: 22,
  },
  introLabel: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: RED,
    letterSpacing: 2,
    marginBottom: 6,
  },
  introBody: { fontSize: 10, color: BODY, lineHeight: 1.55 },

  // --- findings section ---
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    paddingBottom: 6,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: INK },
  sectionMeta: { fontFamily: 'Courier', fontSize: 9, color: DIM, letterSpacing: 1 },

  // --- individual finding ---
  finding: {
    marginBottom: 18,
    paddingLeft: 28,
    position: 'relative',
  },
  findingNumber: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 22,
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: 700,
    color: RED,
  },
  findingHeader: { flexDirection: 'row', gap: 6, marginBottom: 4, alignItems: 'center' },
  severityChip: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    fontFamily: 'Courier',
    fontSize: 7,
    letterSpacing: 1.2,
  },
  categoryChip: {
    fontFamily: 'Courier',
    fontSize: 7,
    color: DIM,
    letterSpacing: 1.2,
    paddingTop: 3,
  },
  findingTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 5,
    lineHeight: 1.3,
  },
  findingDetail: {
    fontSize: 10.5,
    color: BODY,
    lineHeight: 1.55,
    marginBottom: 8,
  },
  fixBlock: {
    borderLeftWidth: 2,
    borderLeftColor: RED,
    paddingLeft: 10,
    paddingTop: 3,
    paddingBottom: 3,
  },
  fixLabel: {
    fontFamily: 'Courier',
    fontSize: 7,
    color: RED,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  fixText: { fontSize: 10.5, color: INK, lineHeight: 1.55 },

  // --- CTA ---
  cta: {
    marginTop: 10,
    padding: 16,
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: BG_SOFT,
  },
  ctaKicker: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: RED,
    letterSpacing: 2,
    marginBottom: 6,
  },
  ctaTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 6 },
  ctaText: { fontSize: 10.5, color: BODY, lineHeight: 1.55, marginBottom: 10 },
  ctaLink: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: RED,
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
    fontSize: 8,
    color: DIM,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageNum: { fontFamily: 'Courier' },
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
  return SEVERITY[raw?.toLowerCase()] ?? SEVERITY.medium;
}

function scoreBand(score: number): string {
  if (score >= 85) return 'Strong — a few polish items.';
  if (score >= 70) return 'Above average. Worth fixing the biggest items.';
  if (score >= 55) return 'Average. The issues below are costing you leads.';
  if (score >= 40) return 'Weak. Prospects are bouncing before they trust you.';
  return 'Critical. Most visitors will leave within seconds.';
}

function AuditDocument({ url, businessName, score, summary, issues, date }: AuditPdfArgs) {
  const domain = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  })();

  return (
    <Document
      title={`Audit — ${businessName ?? domain}`}
      author="Agentic Consciousness"
      subject="Website audit"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.brand}>
            <Text style={styles.brandText}>AGENTIC CONSCIOUSNESS</Text>
            <Text style={styles.brandDot}>_</Text>
          </View>
          <Text style={styles.kicker}>WEBSITE AUDIT</Text>
        </View>

        {/* Cover */}
        <Text style={styles.kickerLabel}>PREPARED FOR</Text>
        <Text style={styles.title}>
          {businessName ? businessName : domain}
        </Text>
        <Text style={styles.url}>{url}</Text>

        {/* Score */}
        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>OVERALL</Text>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreOutOf}>/ 100</Text>
          </View>
          <View style={styles.scoreSummary}>
            <Text style={styles.scoreSummaryText}>{scoreBand(score)}</Text>
          </View>
        </View>

        {/* Intro / orientation */}
        {summary ? (
          <View style={styles.intro}>
            <Text style={styles.introLabel}>AT A GLANCE</Text>
            <Text style={styles.introBody}>{summary}</Text>
          </View>
        ) : null}

        {/* Findings header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Findings</Text>
          <Text style={styles.sectionMeta}>
            {issues.length} ITEM{issues.length === 1 ? '' : 'S'} · ORDERED BY SEVERITY
          </Text>
        </View>

        {issues.map((issue, i) => {
          const sev = getSev(issue.severity);
          return (
            <View key={i} style={styles.finding} wrap={false}>
              <Text style={styles.findingNumber}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <View style={styles.findingHeader}>
                <Text style={[styles.severityChip, { backgroundColor: sev.bg, color: sev.fg }]}>
                  {sev.label}
                </Text>
                <Text style={styles.categoryChip}>
                  · {(issue.category || 'General').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.findingTitle}>{issue.title}</Text>
              <Text style={styles.findingDetail}>{issue.detail}</Text>
              {issue.fix ? (
                <View style={styles.fixBlock}>
                  <Text style={styles.fixLabel}>WHAT TO DO</Text>
                  <Text style={styles.fixText}>{issue.fix}</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        {/* CTA */}
        <View style={styles.cta} wrap={false}>
          <Text style={styles.ctaKicker}>NEXT STEP</Text>
          <Text style={styles.ctaTitle}>Want us to fix every one of these — in 48 hours?</Text>
          <Text style={styles.ctaText}>
            Our Lightning Website Sprint rebuilds your site mobile-first,
            AI-optimised, with Core Web Vitals tuned and a Claude chatbot
            embedded. $999 flat. Money-back guarantee if it&apos;s not live in
            48 hours.
          </Text>
          <Text style={styles.ctaLink}>agenticconsciousness.com.au/book</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Agentic Consciousness · agenticconsciousness.com.au · {date}</Text>
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
