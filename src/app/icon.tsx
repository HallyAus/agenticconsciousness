import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          fontFamily: 'sans-serif',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px' }}>
          AC
        </span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#ff3d00', letterSpacing: '-1px' }}>
          _
        </span>
      </div>
    ),
    { ...size }
  );
}
