'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { whoDid } from '@/lib/characters';
import { ago, usd } from '@/lib/format';
import { Avatar } from '../Avatar';
import { ProofLink, useTween } from '../ui';

function Row({ label, value, sub, cls = '' }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-surface2 px-4 py-3">
      <div>
        <div className={`num text-[22px] font-black tracking-tight ${cls}`}>{value}</div>
        <div className="text-[12px] text-muted">{label}</div>
      </div>
      {sub && <div className="num font-mono text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

const VERB: Record<string, string> = { flag: 'spotted', takeover: 'took over', buy: 'bought', sell: 'sold', abandon: 'abandoned', post: 'posted on', reply: 'replied on', claim: 'claimed fees on' };

/** BUILD-style two-up: platform stats on the left, recent activity with faces on the right. */
export function StatsCards() {
  const snap = useStore((s) => s.snap);
  const scanned = useTween(snap?.stats.scanned ?? 0);
  const vol = useTween(snap?.stats.volumeRevived ?? 0);
  const pnl = useTween(snap?.agent.pnlTotal ?? 0);
  const paid = useTween(snap?.stats.paidToHolders ?? 0);
  const open = useMemo(() => snap?.tokens.filter((t) => t.status === 'taken_over').length ?? 0, [snap?.tokens]);
  const trades24 = useMemo(() => (snap?.actions ?? []).filter((a) => ['takeover', 'buy', 'sell', 'abandon'].includes(a.kind) && snap!.now - a.at < 86_400_000).length, [snap]);
  // Agent moves first (trades, claims, at most two posts). When there aren't
  // enough (live mode before the first takeover), fill with scanner findings,
  // preferring ones backed by a real tx (dev launches and dev sells).
  const recent = useMemo(() => {
    const all = snap?.actions ?? [];
    const moves = all.filter((a) => a.kind !== 'flag' && a.kind !== 'post' && a.kind !== 'reply').slice(0, 7);
    const social = all.filter((a) => a.kind === 'post' || a.kind === 'reply').slice(0, 2);
    const picked = [...moves, ...social];
    if (picked.length < 7) {
      const flags = all.filter((a) => a.kind === 'flag');
      const withTx = flags.filter((a) => a.txSig);
      const rest = flags.filter((a) => !a.txSig);
      picked.push(...[...withTx, ...rest].slice(0, 7 - picked.length));
    }
    return picked.sort((a, b) => b.at - a.at).slice(0, 7);
  }, [snap?.actions]);
  if (!snap) return null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.15fr]">
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-bold">Platform stats</h2>
          <span className="chip text-gain"><span className="h-1.5 w-1.5 rounded-full bg-gain" />{snap.source.kind === 'live' ? 'Live' : 'Sim'}</span>
        </div>
        <div className="flex flex-col gap-2">
          <Row label="Coins scanned" value={Math.round(scanned).toLocaleString('en-US')} />
          <Row label="Volume revived" value={usd(vol, 2)} sub={`${snap.stats.takeovers} takeovers`} />
          <Row label="Agent PnL" value={`${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} SOL`} cls={pnl >= 0 ? 'text-gain' : 'text-loss'} sub="realized + unrealized" />
          <Row label="Paid to holders" value={`${paid.toFixed(2)} SOL`} cls="text-accent" sub={`${snap.agent.pendingToHolders.toFixed(3)} pending`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
          <span><b className="text-fg">{open}</b> open takeovers</span>
          <span><b className="text-fg">{trades24}</b> trades 24h</span>
          <span><b className="text-fg">{snap.agent.vaultSol.toFixed(2)}</b> SOL in vault</span>
        </div>
      </section>
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-bold">Recent activity</h2>
          <Link href="/activity" className="link text-[12px]">All →</Link>
        </div>
        {!recent.length && <p className="py-8 text-center font-mono text-[12px] text-muted">Hawk is scanning. First findings appear within a minute.</p>}
        <ul className="divide-y divide-line">
          {recent.map((a) => {
            const c = whoDid(a.kind);
            return (
              <li key={a.id} className="flex items-center gap-3 py-2">
                <Avatar c={c} size={30} />
                <div className="min-w-0 flex-1 text-[13px]">
                  <span className="font-semibold">{c.name}</span> <span className="text-muted">{VERB[a.kind]}</span>{' '}
                  <Link href={`/token/${a.ca}`} className="font-bold hover:text-accent">${a.ticker}</Link>
                  {a.amount != null && <span className={`num ml-1.5 font-mono text-[11px] ${a.kind === 'sell' || a.kind === 'claim' ? 'text-gain' : 'text-accent'}`}>{a.kind === 'sell' || a.kind === 'claim' || a.kind === 'abandon' ? '+' : '−'}{a.amount.toFixed(3)} SOL</span>}
                </div>
                <ProofLink a={a} />
                <span className="num w-10 text-right font-mono text-[11px] text-muted">{ago(a.at, snap.now)}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
