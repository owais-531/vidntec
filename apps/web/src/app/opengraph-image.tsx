import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site';

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
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
          background: 'linear-gradient(135deg, #e92c46 0%, #a81b2f 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 6, opacity: 0.8 }}>MADE TO ORDER</div>
        <div style={{ fontSize: 120, fontWeight: 800, marginTop: 16, letterSpacing: -2 }}>
          VIDNTEC
        </div>
        <div style={{ fontSize: 40, marginTop: 24, opacity: 0.9, maxWidth: 900 }}>
          {siteConfig.tagline}
        </div>
      </div>
    ),
    size,
  );
}
