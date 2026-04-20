import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

/**
 * Audit PDF — mirrors the email-template aesthetic (red brand accents,
 * heavy-display headlines, monospace labels) in PDF form using
 * @react-pdf/renderer. Pure JS, no Chromium.
 *
 * Kept intentionally simple: no external fonts (uses Helvetica built-in)
 * so cold starts stay cheap.
 */

const RED = '#ff3d00';
const TEXT = '#111111';
const DIM = '#555555';
const RULE = '#e1e1e1';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: TEXT, fontFamily: 'Helvetica' },
  header: { borderBottomWidth: 2, borderBottomColor: RED, paddingBottom: 10, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  brand: { fontSize: 18, fontWeight: 700, letterSpacing: -0.5 },
  brandDot: { color: RED, fontSize: 18, fontWeight: 700 },
  label: { fontFamily: 'Courier', fontSize: 9, color: RED, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  url: { fontFamily: 'Courier', fontSize: 10, color: RED, marginBottom: 14 },
  score: { fontSize: 11, color: '#ffffff', backgroundColor: RED, paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start', marginBottom: 12, letterSpacing: 1, fontFamily: 'Courier' },
  summary: { fontSize: 10, color: TEXT, lineHeight: 1.55, marginBottom: 18 },
  sectionLabel: { fontFamily: 'Courier', fontSize: 9, color: RED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  issue: { borderLeftWidth: 2, borderLeftColor: RED, paddingLeft: 10, paddingVertical: 6, marginBottom: 12 },
  issueMeta: { fontFamily: 'Courier', fontSize: 8, color: RED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  issueTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  issueDetail: { fontSize: 10, color: TEXT, lineHeight: 1.5, marginBottom: 4 },
  fixLabel: { fontFamily: 'Courier', fontSize: 8, color: RED, letterSpacing: 1, textTransform: 'uppercase' },
  fixText: { fontSize: 10, color: TEXT, lineHeight: 1.5 },
  cta: { marginTop: 18, padding: 12, borderWidth: 1.5, borderColor: RED },
  ctaTitle: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  ctaText: { fontSize: 10, color: TEXT, lineHeight: 1.5, marginBottom: 8 },
  ctaLink: { fontSize: 10, color: RED, fontWeight: 700 },
  footer: { position: 'absolute', bottom: 22, left: 40, right: 40, borderTopWidth: 1, borderTopColor: RULE, paddingTop: 8, fontSize: 8, color: DIM, flexDirection: 'row', justifyContent: 'space-between' },
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

function AuditDocument({ url, businessName, score, summary, issues, date }: AuditPdfArgs) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>
            AC<Text style={styles.brandDot}>_</Text>
          </Text>
          <Text style={styles.label}>Website audit</Text>
        </View>

        <Text style={styles.title}>
          {businessName ? `Audit — ${businessName}` : 'Website audit'}
        </Text>
        <Text style={styles.url}>{url}</Text>
        <Text style={styles.score}>SCORE {score} / 100</Text>

        {summary ? <Text style={styles.summary}>{summary}</Text> : null}

        <Text style={styles.sectionLabel}>{issues.length} findings</Text>
        {issues.map((issue, i) => (
          <View key={i} style={styles.issue} wrap={false}>
            <Text style={styles.issueMeta}>
              {(issue.severity || 'medium').toUpperCase()} · {issue.category || 'General'}
            </Text>
            <Text style={styles.issueTitle}>{issue.title}</Text>
            <Text style={styles.issueDetail}>{issue.detail}</Text>
            <Text style={styles.fixLabel}>FIX → <Text style={styles.fixText}>{issue.fix}</Text></Text>
          </View>
        ))}

        <View style={styles.cta} wrap={false}>
          <Text style={styles.ctaTitle}>Rebuild in 48 hours — $999</Text>
          <Text style={styles.ctaText}>
            Every issue in this audit is covered by our Lightning Website Sprint:
            mobile-first, AI-optimised, Core Web Vitals tuned, Claude chatbot
            embedded. Money-back guarantee if not live in 48 hours.
          </Text>
          <Text style={styles.ctaLink}>https://agenticconsciousness.com.au/book</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Agentic Consciousness · agenticconsciousness.com.au</Text>
          <Text>{date}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderAuditPdf(args: AuditPdfArgs): Promise<Buffer> {
  return await renderToBuffer(<AuditDocument {...args} />);
}
