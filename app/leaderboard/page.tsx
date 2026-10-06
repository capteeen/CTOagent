'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Token } from '@/lib/types';
import { ago, pct, usd } from '@/lib/format';
import { CoinAvatar, CopyText, Skeleton, StatusBadge } from '@/components/ui';

type Sort = 'pnl' | 'roi' | 'vol' | 'fees' | 'newest';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'pnl', label: 'PnL' },
  { id: 'roi', label: 'ROI' },
  { id: 'vol', label: 'Vol Δ' },
  { id: 'fees', label: 'Fees' },
  { id: 'newest', label: 'Newest' },
];
type Filt = 'all' | 'taken_over' | 'revived' | 'abandoned';

const roi = (t: Token) => {
  const inv = t.position.cost + Math.max(0, -t.position.realized);
  const basis = inv > 0 ? inv : t.position.cost;
  return basis > 0 ? (t.position.pnl / basis) * 100 : 0;
};
const volD = (t: Token) => (t.volAtTakeover ? (t.vol24h / t.volAtTakeover - 1) * 100 : 0);

/** Every takeover, ranked. Same rules for all of them. */
export default function Leaderboard() {
  const snap = useStore((s) => s.snap);
  const [sort, setSort] = useState<Sort>('pnl');
  const [filt, setFilt] = useState<Filt>('all');
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase().replace('$', '');
    const list = (snap?.tokens ?? []).filter((t) => t.takeoverAt && (filt === 'all' || t.status === filt) && (!s || t.ticker.toLowerCase().includes(s) || t.name.toLowerCase().includes(s) || t.ca.toLowerCase().includes(s)));
    const key: Record<Sort, (t: Token) => number> = { pnl: (t) => t.position.pnl, roi, vol: volD, fees: (t) => t.feesEarned, newest: (t) => t.takeoverAt ?? 0 };
    return list.sort((a, b) => key[sort](b) - key[sort](a));
  }, [snap?.tokens, sort, filt, q]);
  if (!snap) return <div className="py-6"><Skeleton rows={12} /></div>;
  const medal = ['bg-accent text-onaccent', 'bg-fg text-bg', 'bg-surface2 text-fg'];
  return (
    <div className="py-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-[34px] font-black tracking-tight"><span className="h-5 w-7 rounded-md bg-accent" />Leaderboard</h1>
          <p className="max-w-2xl text-muted">Every coin CTO took over, ranked. Same vault, same rules, no favourites.</p>
        </div>
        <Link href="/tokens?tab=watching" className="btn-primary">What&apos;s dying now →</Link>
      </div>
      <div className="card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="flex gap-1 rounded-lg bg-surface2 p-1">
            {SORTS.map((s) => <button key={s.id} onClick={() => setSort(s.id)} className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${sort === s.id ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>{s.label}</button>)}
          </div>
          <div className="flex gap-1 rounded-lg bg-surface2 p-1">
            {(['all', 'taken_over', 'revived', 'abandoned'] as Filt[]).map((f) => <button key={f} onClick={() => setFilt(f)} className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${filt === f ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>{f === 'all' ? 'All' : f === 'taken_over' ? 'Active' : f[0].toUpperCase() + f.slice(1)}</button>)}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ticker, CA" className="ml-auto h-8 w-full rounded-lg border border-line bg-bg px-3 font-mono text-[12px] outline-none focus:border-accent sm:w-64" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                {['#', 'Coin', 'Status', 'Entry mcap', 'Mcap now', 'Position', 'PnL (SOL)', 'ROI', 'Vol Δ', 'Fees', 'Took over'].map((h, i) => <th key={h} className={`px-3 py-2 font-semibold ${i >= 3 ? 'text-right' : ''}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((t, i) => {
                const r = roi(t), v = volD(t);
                return (
                  <tr key={t.ca} className="hover:bg-surface2">
                    <td className="px-3 py-2.5"><span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[12px] font-black ${medal[i] ?? 'text-muted'}`}>{i + 1}</span></td>
                    <td className="px-3 py-2.5">
                      <Link href={`/token/${t.ca}`} className="flex items-center gap-2.5">
                        <CoinAvatar src={t.image} size={32} />
                        <div className="min-w-0"><div className="font-bold">{t.name} <span className="font-mono text-[11px] font-normal text-muted">${t.ticker}</span></div><CopyText text={t.ca} /></div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="num px-3 py-2.5 text-right font-mono">{t.takeoverPrice ? usd(t.takeoverPrice * 1e9) : '—'}</td>
                    <td className="num px-3 py-2.5 text-right font-mono">{usd(t.mcap)}</td>
                    <td className="num px-3 py-2.5 text-right font-mono">{t.position.sol.toFixed(3)}</td>
                    <td className={`num px-3 py-2.5 text-right font-mono font-bold ${t.position.pnl >= 0 ? 'text-gain' : 'text-loss'}`}>{t.position.pnl >= 0 ? '+' : ''}{t.position.pnl.toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-right"><span className={`num rounded-md px-1.5 py-0.5 font-mono text-[12px] font-bold ${r >= 0 ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss'}`}>{pct(r, 1, true)}</span></td>
                    <td className={`num px-3 py-2.5 text-right font-mono ${v >= 0 ? 'text-accent' : 'text-loss'}`}>{pct(v, 0, true)}</td>
                    <td className="num px-3 py-2.5 text-right font-mono text-gain">{t.feesEarned.toFixed(3)}</td>
                    <td className="num px-3 py-2.5 text-right font-mono text-muted">{ago(t.takeoverAt!, snap.now)} ago</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <p className="p-8 text-center text-muted">No takeovers match.</p>}
        </div>
      </div>
    </div>
  );
}
