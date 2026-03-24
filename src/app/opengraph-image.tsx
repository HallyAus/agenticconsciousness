import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Agentic Consciousness — AI Consulting';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-3px', lineHeight: 0.95 }}>
          AGENTIC
        </div>
        <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-3px', lineHeight: 0.95, color: '#ff3d00' }}>
          CONSCIOUSNESS
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 24,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '4px',
            textTransform: 'uppercase' as const,
          }}
        >
          AI Consulting — Strategy — Automation
        </div>
      </div>
    ),
    { ...size }
  );
}
