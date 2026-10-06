'use client';

import { useStore } from '@/lib/store';
import { usd } from '@/lib/format';
import { useTween } from './ui';

function Stat({ label, value, fmt, hint }: { label: string; value: number; fmt: (n: number) => string; hint: string }) {
  const v = useTween(value);
  return (
    <div className="px-4 py-3" title={hint}>
      <div className="label">{label}</div>
      <div className="num mt-1 text-[22px] font-semibold tracking-tight">{fmt(v)}</div>
    </div>
  );
}

export function StatsStrip() {
  const stats = useStore((s) => s.snap?.stats);
  const s = stats ?? { scanned: 0, takeovers: 0, volumeRevived: 0, paidToHolders: 0 };
  return (
    <div className="card grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line md:[&>*:nth-child(-n+2)]:border-b-0">
      <Stat label="Coins scanned" value={s.scanned} fmt={(n) => Math.round(n).toLocaleString('en-US')} hint="pump.fun launches the scanner has evaluated" />
      <Stat label="Takeovers" value={s.takeovers} fmt={(n) => Math.round(n).toString()} hint="Coins the agent bought into and took over" />
      <Stat label="Volume revived" value={s.volumeRevived} fmt={(n) => usd(n, 2)} hint="Cumulative volume since takeover on active and revived coins" />
      <Stat label="Paid to holders" value={s.paidToHolders} fmt={(n) => `${n.toFixed(2)} SOL`} hint="70% of fees and realized PnL, distributed to CTO holders" />
    </div>
  );
}
