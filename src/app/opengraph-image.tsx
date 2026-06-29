import { ImageResponse } from 'next/og';

export const alt = '$OMNOM DAO — Governance Portal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F0F23',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: '60%',
            height: '120%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '50%',
            height: '100%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          {/* Dog emoji */}
          <div style={{ fontSize: 72, marginBottom: 16 }}>🐕</div>

          {/* Title */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              letterSpacing: '-2px',
              display: 'flex',
            }}
          >
            <span style={{ color: '#FFD700' }}>$OMNOM</span>
            <span style={{ color: '#F8FAFC', marginLeft: 12 }}>DAO</span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 32,
              color: '#94A3B8',
              marginTop: 16,
              fontWeight: 300,
            }}
          >
            Governance Portal
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 18,
              color: 'rgba(255,215,0,0.6)',
              marginTop: 24,
              fontWeight: 600,
              letterSpacing: '4px',
              textTransform: 'uppercase',
            }}
          >
            Quadratic Token Voting · Dogechain
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #FFD700, #8B5CF6, #FFD700)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
