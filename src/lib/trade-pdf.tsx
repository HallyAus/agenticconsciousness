import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { Trade } from '@/data/trades';
import type { TradeCity } from '@/data/trade-cities';

const RED = '#ff3d00';
const TEXT = '#111111';
const DIM = '#555555';
const RULE = '#e1e1e1';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: TEXT, fontFamily: 'Helvetica' },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: RED,
    paddingBottom: 10,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brand: { fontSize: 18, fontWeight: 700, letterSpacing: -0.5 },
  brandDot: { color: RED, fontSize: 18, fontWeight: 700 },
  label: { fontFamily: 'Courier', fontSize: 9, color: RED, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 6 },
  subtitle: { fontFamily: 'Courier', fontSize: 10, color: RED, marginBottom: 14 },
  intro: { fontSize: 10, color: TEXT, lineHeight: 1.55, marginBottom: 18 },
  sectionLabel: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: RED,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  check: { borderLeftWidth: 2, borderLeftColor: RED, paddingLeft: 10, paddingVertical: 6, marginBottom: 10 },
  checkMeta: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: RED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  checkTitle: { fontSize: 11, fontWeight: 700, marginBottom: 3 },
  checkBody: { fontSize: 9.5, color: TEXT, lineHeight: 1.5 },
  h2: { fontSize: 14, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  bodyText: { fontSize: 10, color: TEXT, lineHeight: 1.55, marginBottom: 8 },
  cta: { marginTop: 20, padding: 12, borderWidth: 1.5, borderColor: RED },
  ctaTitle: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  ctaText: { fontSize: 10, color: TEXT, lineHeight: 1.5, marginBottom: 8 },
  ctaLink: { fontSize: 10, color: RED, fontWeight: 700 },
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 8,
    fontSize: 8,
    color: DIM,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

interface TradeAuditDocProps {
  trade: Trade;
  city?: TradeCity;
  date: string;
}

function TradeAuditDocument({ trade, city, date }: TradeAuditDocProps) {
  const locationLine = city ? `${trade.plural} in ${city.name}, ${city.state}` : `${trade.plural} — Australia-wide`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>
            AC<Text style={styles.brandDot}>_</Text>
          </Text>
          <Text style={styles.label}>{trade.name} website audit</Text>
        </View>

        <Text style={styles.title}>{trade.leadMagnetTitle}</Text>
        <Text style={styles.subtitle}>{locationLine}</Text>

        <Text style={styles.intro}>{trade.leadMagnetPromise}</Text>

        <Text style={styles.sectionLabel}>The 7 checks</Text>
        {trade.leadMagnetChecks.map((c, i) => (
          <View key={i} style={styles.check} wrap={false}>
            <Text style={styles.checkMeta}>CHECK {String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.checkTitle}>{c}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Three leaks that cost you jobs</Text>
        {trade.pains.map((p, i) => (
          <View key={i} wrap={false}>
            <Text style={styles.checkMeta}>
              LEAK {String(i + 1).padStart(2, '0')} &middot; {p.title}
            </Text>
            <Text style={styles.bodyText}>{p.body}</Text>
          </View>
        ))}

        <Text style={styles.h2}>What a $999 website fixes</Text>
        {trade.modules.map((m, i) => (
          <View key={i} wrap={false}>
            <Text style={styles.checkMeta}>
              MODULE {String(i + 1).padStart(2, '0')} &middot; {m.title}
            </Text>
            <Text style={styles.bodyText}>{m.body}</Text>
          </View>
        ))}

        {city ? (
          <>
            <Text style={styles.h2}>Why this matters in {city.name}</Text>
            <Text style={styles.bodyText}>{city.marketSignal}</Text>
            <Text style={styles.bodyText}>{city.localSeoAngle}</Text>
          </>
        ) : null}

        <View style={styles.cta} wrap={false}>
          <Text style={styles.ctaTitle}>Live in 7 days &mdash; $999</Text>
          <Text style={styles.ctaText}>
            Everything in this checklist is covered by the Lightning Website Sprint. Flat $999,
            live within 7 days, copywriting and Google Business setup included. Three slots per
            month &mdash; book a discovery call to claim one.
          </Text>
          <Text style={styles.ctaLink}>
            https://agenticconsciousness.com.au/trades/{trade.slug}
            {city ? `/${city.slug}` : ''}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Agentic Consciousness &middot; agenticconsciousness.com.au</Text>
          <Text>{date}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderTradeAuditPdf(args: TradeAuditDocProps): Promise<Buffer> {
  return await renderToBuffer(<TradeAuditDocument {...args} />);
}
