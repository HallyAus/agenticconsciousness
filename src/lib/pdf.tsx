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
const RED_TINT = '#fff4f0';
const INK = '#0a0a0a';
const BODY = '#1f1f1f';
const DIM = '#4a4a4a';
const RULE = '#cccccc';
const BG_SOFT = '#f6f4f2';

const SEVERITY: Record<string, { bg: string; fg: string; label: string; border: string; titleSize: number; accent: string }> = {
  critical: { bg: '#ff3d00', fg: '#ffffff', label: 'CRITICAL', border: '#ff3d00', titleSize: 17, accent: RED_TINT },
  high:     { bg: '#d97706', fg: '#ffffff', label: 'HIGH',     border: '#d97706', titleSize: 15, accent: '#fdf6e8' },
  medium:   { bg: '#eab308', fg: '#0a0a0a', label: 'MEDIUM',   border: '#eab308', titleSize: 14, accent: '#fffdf2' },
  low:      { bg: '#e5e7eb', fg: '#1f2937', label: 'LOW',      border: '#9ca3af', titleSize: 13, accent: '#ffffff' },
};

const styles = StyleSheet.create({
  page: {
    padding: 44,
    paddingBottom: 60,
    fontSize: 12,
    color: BODY,
    fontFamily: 'Helvetica',
    lineHeight: 1.55,
  },

  // --- header bar ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: RED,
    paddingBottom: 12,
    marginBottom: 24,
  },
  brand: { flexDirection: 'row', alignItems: 'baseline' },
  brandText: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: 0.3 },
  brandDot: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: RED },
  kicker: { fontFamily: 'Courier', fontSize: 10, color: RED, letterSpacing: 2 },

  // --- cover block ---
  kickerLabel: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 10,
    lineHeight: 1.1,
  },
  url: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: RED,
    marginBottom: 22,
  },

  // --- score block ---
  scoreRow: { flexDirection: 'row', marginBottom: 22, gap: 16 },
  scoreBox: {
    borderWidth: 3,
    borderColor: RED,
    padding: 14,
    width: 130,
    alignItems: 'flex-start',
  },
  scoreLabel: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
    marginBottom: 6,
    fontWeight: 700,
  },
  scoreValue: {
    fontSize: 52,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    lineHeight: 1,
    letterSpacing: -1,
  },
  scoreOutOf: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: DIM,
    marginTop: 4,
    letterSpacing: 1,
  },
  scoreSummary: { flex: 1, padding: 6, justifyContent: 'center' },
  scoreSummaryText: {
    fontSize: 14,
    color: INK,
    lineHeight: 1.45,
    fontFamily: 'Helvetica-Bold',
  },

  // --- at-a-glance ---
  intro: {
    padding: 14,
    backgroundColor: BG_SOFT,
    borderLeftWidth: 3,
    borderLeftColor: RED,
    marginBottom: 24,
  },
  introLabel: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: 700,
  },
  introBody: { fontSize: 11.5, color: BODY, lineHeight: 1.6 },

  // --- findings section ---
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    paddingBottom: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: INK },
  sectionMeta: { fontFamily: 'Courier', fontSize: 10, color: DIM, letterSpacing: 1 },

  // --- individual finding ---
  finding: {
    marginBottom: 16,
    padding: 12,
    paddingLeft: 16,
    borderLeftWidth: 4,
  },
  findingRow: { flexDirection: 'row', gap: 10 },
  findingNumber: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: 700,
    width: 26,
  },
  findingBody: { flex: 1 },
  findingHeaderRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  severityChip: {
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 7,
    paddingRight: 7,
    fontFamily: 'Courier',
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: 700,
  },
  categoryChip: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: DIM,
    letterSpacing: 1.2,
    paddingTop: 4,
  },
  findingTitle: {
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 6,
    lineHeight: 1.25,
  },
  findingDetail: {
    fontSize: 11.5,
    color: BODY,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  fixBlock: {
    borderLeftWidth: 2,
    borderLeftColor: RED,
    paddingLeft: 10,
    paddingTop: 4,
    paddingBottom: 4,
  },
  fixLabel: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: RED,
    letterSpacing: 1.5,
    marginBottom: 4,
    fontWeight: 700,
  },
  fixText: { fontSize: 11.5, color: INK, lineHeight: 1.6 },

  // --- CTA ---
  cta: {
    marginTop: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: RED,
    backgroundColor: BG_SOFT,
  },
  ctaKicker: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: RED,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: 700,
  },
  ctaTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  ctaText: { fontSize: 11.5, color: BODY, lineHeight: 1.6, marginBottom: 12 },
  ctaLink: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
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
    fontSize: 9,
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
  if (score >= 85) return 'Strong — a few polish items below.';
  if (score >= 70) return 'Above average. Worth fixing the biggest items below.';
  if (score >= 55) return 'Average. The issues below are costing you leads every day.';
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
            <Text style={styles.scoreOutOf}>OUT OF 100</Text>
          </View>
          <View style={styles.scoreSummary}>
            <Text style={styles.scoreSummaryText}>{scoreBand(score)}</Text>
          </View>
        </View>

        {/* At a glance */}
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
          const isCritical = (issue.severity || '').toLowerCase() === 'critical';
          return (
            <View
              key={i}
              style={[
                styles.finding,
                { borderLeftColor: sev.border, backgroundColor: sev.accent },
              ]}
              wrap={false}
            >
              <View style={styles.findingRow}>
                <Text style={[styles.findingNumber, { color: sev.border }]}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <View style={styles.findingBody}>
                  <View style={styles.findingHeaderRow}>
                    <Text style={[styles.severityChip, { backgroundColor: sev.bg, color: sev.fg }]}>
                      {sev.label}
                    </Text>
                    <Text style={styles.categoryChip}>
                      · {(issue.category || 'General').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.findingTitle, { fontSize: sev.titleSize, color: isCritical ? RED : INK }]}>
                    {issue.title}
                  </Text>
                  <Text style={styles.findingDetail}>{issue.detail}</Text>
                  {issue.fix ? (
                    <View style={styles.fixBlock}>
                      <Text style={styles.fixLabel}>WHAT TO DO</Text>
                      <Text style={styles.fixText}>{issue.fix}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
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
            embedded. $999 flat. Money-back guarantee if it&apos;s not live
            within 48 hours.
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
