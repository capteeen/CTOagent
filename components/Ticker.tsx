'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { usd } from '@/lib/format';

/** Price tape of the most active coins. Doubled so the marquee loops seamlessly. */
export function Ticker() {
  const tokens = useStore((s) => s.snap?.tokens);
  const items = useMemo(() => {
    const list = (tokens ?? [])
      .filter((t) => t.mcap > 0)
      .sort((a, b) => (b.takeoverAt ? 1 : 0) - (a.takeoverAt ? 1 : 0) || b.vol24h - a.vol24h)
      .slice(0, 18)
      .map((t) => {
        // since takeover for our coins; otherwise the market's 24h change (live) or drawdown from peak (sim)
        const d = t.takeoverPrice ? (t.price / t.takeoverPrice - 1) * 100 : t.change24h ?? (t.peakPrice > 0 ? (t.price / t.peakPrice - 1) * 100 : 0);
        return { ca: t.ca, ticker: t.ticker, mcap: t.mcap, d, taken: !!t.takeoverAt };
      });
    return list;
  }, [tokens]);
  if (!items.length) return <div className="h-8 border-b border-line bg-surface/60" />;
  const row = [...items, ...items];
  return (
    <div className="h-8 overflow-hidden border-b border-line bg-surface/60">
      <div className="tape h-8 items-center">
        {row.map((t, i) => (
          <Link key={`${t.ca}-${i}`} href={`/token/${t.ca}`} className="flex h-8 items-center gap-2 px-4 font-mono text-[12px] hover:bg-surface2">
            <span className="font-bold">${t.ticker}</span>
            <span className="num text-muted">{usd(t.mcap)}</span>
            <span className={`num ${t.d >= 0 ? 'text-gain' : 'text-loss'}`}>{t.d >= 0 ? '+' : ''}{t.d.toFixed(1)}%</span>
            {t.taken && <span className="rounded bg-accent/15 px-1 text-[10px] font-bold text-accent">CTO</span>}
            <span className="pl-2 text-line">/</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
