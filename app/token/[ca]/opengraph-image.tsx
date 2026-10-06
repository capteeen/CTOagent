import { ImageResponse } from 'next/og';
import { serverToken } from '@/lib/serverWorld';
import { usd } from '@/lib/format';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Taken over by CTO';

const C = { bg: '#FFFFFF', surface: '#F7F7F8', line: '#E5E5E7', fg: '#0A0A0A', muted: '#6B6B70', accent: '#2F6BFF', loss: '#E5484D', gain: '#1F9D55' };

export default async function Image({ params }: { params: { ca: string } }) {
  const t = serverToken(params.ca);
  const taken = !!t?.takeoverAt;
  const ticker = t?.ticker ?? 'COIN';
  const before = t?.volAtTakeover ?? t?.vol24h ?? 0;
  const after = t?.vol24h ?? 0;
  const delta = before > 0 ? (after / before - 1) * 100 : 0;
  const hue = t ? (parseInt(t.image.match(/hsl\((\d+)/)?.[1] ?? '212', 10) || 212) : 212;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, padding: 64, fontFamily: 'sans-serif', color: C.fg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', width: 44, height: 44, borderRadius: 8, background: C.fg, color: C.bg, alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>CTO</div>
            <div style={{ fontSize: 22, color: C.muted }}>the agent that takes over dead coins</div>
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: C.muted }}>{t ? `${t.ca.slice(0, 6)}…${t.ca.slice(-6)}` : ''}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 36, marginTop: 70 }}>
          <div style={{ display: 'flex', width: 168, height: 168, borderRadius: 24, background: `hsl(${hue} 70% 92%)`, border: `2px solid ${C.line}`, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', width: 120, height: 120, borderRadius: 60, background: `hsl(${hue} 65% 55%)`, alignItems: 'center', justifyContent: 'center', color: '#0A0A0A', fontSize: 30, fontWeight: 700 }}>
              {ticker.slice(0, 4)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 34, color: C.muted }}>{t ? `${t.name} · $${ticker}` : 'Unknown coin'}</div>
            <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, letterSpacing: -3, color: taken ? C.accent : C.loss, marginTop: 6 }}>
              {taken ? 'TAKEN OVER BY CTO' : 'ON CTO’S RADAR'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', border: `2px solid ${C.line}`, borderRadius: 12, background: C.surface }}>
          {[
            ['Death score', `${t?.deathScore ?? '—'}/100`, C.loss],
            [taken ? 'Vol before' : 'Vol 24h', usd(before), C.fg],
            [taken ? 'Vol after' : 'Vol now', usd(after), C.fg],
            ['Change', taken ? `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%` : '—', delta >= 0 ? C.accent : C.loss],
          ].map(([k, v, col], i) => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '22px 28px', borderLeft: i ? `2px solid ${C.line}` : 'none' }}>
              <div style={{ display: 'flex', fontSize: 20, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{k}</div>
              <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: col, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
