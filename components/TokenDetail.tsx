'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStore, type EvidenceTarget } from '@/lib/store';
import type { ActionKind, Post, Token } from '@/lib/types';
import { ago, compact, hours, pct, short, stamp, usd } from '@/lib/format';
import { accountUrl, pumpUrl, xUrl } from '@/lib/links';
import { SUPPLY } from '@/lib/sim';
import { ActionFeed } from './ActionFeed';
import { CoinAvatar, CopyText, DeathBar, ProofLink, Skeleton, StatusBadge, Tick } from './ui';

const TokenChart = dynamic(() => import('./TokenChart').then((m) => m.TokenChart), {
  ssr: false,
  loading: () => <div className="h-[360px] animate-pulse bg-surface md:h-[420px]" />,
});

function Metric({ t, label, field, value, children, cls = '' }: { t: Token; label: string; field?: EvidenceTarget['field']; value: number; children: React.ReactNode; cls?: string }) {
  const inner = <Tick value={value} className={cls}>{children}</Tick>;
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="label">{label}</div>
      <div className="mt-1 text-[15px] font-semibold">
        {field ? (
          <button className="numbtn" onClick={() => useStore.getState().openEvidence({ ca: t.ca, field })} title="Show the actions behind this number">{inner}</button>
        ) : inner}
      </div>
    </div>
  );
}

const TIMELINE_FILTERS: { id: string; label: string; kinds: ActionKind[] | null }[] = [
  { id: 'all', label: 'All', kinds: null },
  { id: 'trades', label: 'Trades', kinds: ['takeover', 'buy', 'sell', 'abandon'] },
  { id: 'social', label: 'Posts', kinds: ['post', 'reply'] },
  { id: 'scanner', label: 'Scanner', kinds: ['flag'] },
  { id: 'fees', label: 'Fees', kinds: ['claim'] },
];

export function TokenDetail({ ca }: { ca: string }) {
  const ready = useStore((s) => s.ready);
  const t = useStore((s) => s.byCa.get(ca));
  const actions = useStore((s) => s.snap?.actionsByCa[ca]);
  const posts = useStore((s) => s.snap?.postsByCa[ca]);
  const now = useStore((s) => s.snap?.now ?? 0);
  const [filter, setFilter] = useState('all');

  const timeline = useMemo(() => {
    const f = TIMELINE_FILTERS.find((x) => x.id === filter)!;
    return (actions ?? []).filter((a) => !f.kinds || f.kinds.includes(a.kind));
  }, [actions, filter]);

  if (!ready) return <div className="py-6"><Skeleton rows={12} /></div>;
  if (!t)
    return (
      <div className="py-24 text-center">
        <p className="font-mono text-muted">Not tracking {short(ca, 6)}.</p>
        <p className="mt-1 text-muted">The Phase 1 simulator reseeds on reload; coins discovered live may not persist.</p>
        <Link href="/tokens" className="btn mt-4">Back to tokens</Link>
      </div>
    );

  const volD = t.volAtTakeover ? (t.vol24h / t.volAtTakeover - 1) * 100 : null;
  const mD = t.takeoverPrice ? (t.price / t.takeoverPrice - 1) * 100 : null;
  const trades = (actions ?? []).filter((a) => ['takeover', 'buy', 'sell', 'abandon', 'claim'].includes(a.kind));
  const buys = trades.filter((a) => a.kind === 'takeover' || a.kind === 'buy');
  const sells = trades.filter((a) => a.kind === 'sell' || a.kind === 'abandon');
  const sum = (xs: typeof trades) => xs.reduce((s, a) => s + (a.amount ?? 0), 0);

  return (
    <div className="py-5">
      <Link href="/tokens" className="text-[12px] text-muted hover:text-fg">← Tokens</Link>

      {/* header */}
      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <CoinAvatar src={t.image} size={52} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[22px] font-semibold">{t.name}</h1>
              <span className="font-mono text-muted">${t.ticker}</span>
              <StatusBadge status={t.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              <span className="flex items-center gap-1 text-muted">CA <CopyText text={t.ca} display={short(t.ca, 6)} /></span>
              {t.devWallet ? (
                <a href={accountUrl(t.devWallet)} target="_blank" rel="noreferrer" className="text-muted hover:text-fg">
                  dev <span className="font-mono text-[11px] text-loss">{short(t.devWallet)}</span>↗
                </a>
              ) : (
                <span className="font-mono text-[11px] text-muted">dev unknown</span>
              )}
              {t.xHandle ? (
                <a href={xUrl(t.xHandle)} target="_blank" rel="noreferrer" className="link font-mono text-[11px]">@{t.xHandle}↗</a>
              ) : (
                <span className="font-mono text-[11px] text-muted">no CTO account yet</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/token/${t.ca}/opengraph-image`} target="_blank" rel="noreferrer" className="btn">Share card</a>
          <a href={pumpUrl(t.ca)} target="_blank" rel="noreferrer" className="btn-primary">Buy on pump.fun ↗</a>
        </div>
      </div>

      {/* metrics */}
      <div className="card mt-4 grid grid-cols-2 divide-line sm:grid-cols-4 lg:grid-cols-8 lg:divide-x">
        <Metric t={t} label="Mcap" value={Math.round(t.mcap)}>{usd(t.mcap)}{mD != null && <span className={`ml-1.5 text-[11px] ${mD >= 0 ? 'text-accent' : 'text-loss'}`}>{pct(mD, 0, true)}</span>}</Metric>
        <Metric t={t} label="Death score" field="score" value={t.deathScore}><DeathBar score={t.deathScore} /></Metric>
        <Metric t={t} label="Dev sold" field="dev" value={Math.round(t.devSoldPct)} cls={t.devSoldPct >= 80 ? 'text-loss' : ''}>{pct(t.devSoldPct)}</Metric>
        <Metric t={t} label="Silent" field="social" value={Math.round(t.hoursSilent * 10)}>{hours(t.hoursSilent)}</Metric>
        <Metric t={t} label="Vol 24h" field="vol24h" value={Math.round(t.vol24h)}>{usd(t.vol24h)}</Metric>
        <Metric t={t} label="Vol Δ CTO" field="volDelta" value={Math.round(volD ?? 0)} cls={volD == null ? 'text-muted' : volD >= 0 ? 'text-accent' : 'text-loss'}>{volD == null ? '—' : pct(volD, 0, true)}</Metric>
        <Metric t={t} label="Holders" field="holders" value={t.holders}>{t.holdersPeak ? t.holders.toLocaleString('en-US') : <span className="text-muted">—</span>}</Metric>
        <Metric t={t} label="Takeover" value={t.takeoverAt ?? 0}>{t.takeoverAt ? <span className="font-mono text-[13px]">{stamp(t.takeoverAt)}</span> : <span className="text-muted">—</span>}</Metric>
      </div>

      {/* chart */}
      <div className="card mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <span className="label">Market cap · {t.takeoverAt ? 'blue line marks the takeover' : 'no takeover yet'}</span>
          <span className="font-mono text-[11px] text-muted">reconstructed candles (sim)</span>
        </div>
        <TokenChart token={t} actions={actions ?? []} now={now} />
      </div>

      {/* panels */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
        <section className="card flex max-h-[720px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="text-[14px] font-semibold">1 · Timeline</h2>
            <div className="flex gap-1">
              {TIMELINE_FILTERS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded px-1.5 py-0.5 text-[11px] ${filter === f.id ? 'bg-surface text-fg' : 'text-muted hover:text-fg'}`}>{f.label}</button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ActionFeed actions={timeline} limit={300} showCoin={false} compact />
          </div>
        </section>

        <section className="card flex max-h-[720px] flex-col overflow-hidden">
          <div className="border-b border-line px-3 py-2"><h2 className="text-[14px] font-semibold">2 · Takeover wallet</h2></div>
          {t.takeoverAt ? (
            <>
              <div className="grid grid-cols-2 gap-px border-b border-line bg-line">
                {[
                  ['Balance', `${t.position.sol.toFixed(3)} SOL`, 'position'],
                  ['PnL', `${t.position.pnl >= 0 ? '+' : ''}${t.position.pnl.toFixed(3)} SOL`, 'pnl'],
                  ['Bought', `${sum(buys).toFixed(3)} SOL · ${buys.length}`, 'position'],
                  ['Sold', `${sum(sells).toFixed(3)} SOL · ${sells.length}`, 'position'],
                  ['Avg entry', usd(t.position.avgPrice * SUPPLY), 'position'],
                  ['Fees', `${t.feesEarned.toFixed(3)} SOL`, 'fees'],
                ].map(([k, v, f]) => (
                  <button key={k} onClick={() => useStore.getState().openEvidence({ ca: t.ca, field: f as EvidenceTarget['field'] })} className="bg-bg px-3 py-2.5 text-left hover:bg-surface">
                    <div className="label">{k}</div>
                    <div className={`num mt-0.5 font-mono text-[13px] font-semibold ${k === 'PnL' ? (t.position.pnl >= 0 ? 'text-accent' : 'text-loss') : ''}`}>{v}</div>
                  </button>
                ))}
              </div>
              <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
                {trades.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 px-3 py-2 font-mono text-[12px]">
                    <span className="w-9 text-[11px] text-muted">{ago(a.at, now)}</span>
                    <span className={`w-16 uppercase ${a.kind === 'sell' || a.kind === 'claim' ? 'text-gain' : a.kind === 'abandon' ? 'text-muted' : 'text-accent'}`}>{a.kind}</span>
                    <span className="num">{a.kind === 'sell' || a.kind === 'abandon' || a.kind === 'claim' ? '+' : '-'}{(a.amount ?? 0).toFixed(3)}</span>
                    <span className="flex-1 truncate text-muted">{a.price ? `@ ${usd(a.price * SUPPLY)}` : ''}</span>
                    <ProofLink a={a} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="p-4 font-mono text-[12px] text-muted">
              {t.eligibility && !t.eligibility.ok ? `Not eligible: ${t.eligibility.reasons.join('; ')}.` : t.status === 'dead' ? 'Eligible. Takeover queued.' : `Watching. Takeover at score ≥70 (now ${t.deathScore}).`}
            </p>
          )}
        </section>

        <section className="card flex max-h-[720px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="text-[14px] font-semibold">3 · Posts</h2>
            {t.xHandle && <a href={xUrl(t.xHandle)} target="_blank" rel="noreferrer" className="link font-mono text-[11px]">@{t.xHandle}↗</a>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {posts && posts.length ? (
              <ul className="divide-y divide-line">{posts.map((p) => <PostItem key={p.id} p={p} now={now} />)}</ul>
            ) : (
              <p className="p-4 font-mono text-[12px] text-muted">No posts. The agent creates @{t.ticker.slice(0, 12)}CTO at takeover.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PostItem({ p, now }: { p: Post; now: number }) {
  return (
    <li className="px-3 py-3">
      <div className="flex items-center gap-1.5 text-[12px]">
        <span className="font-semibold">@{p.handle}</span>
        <span className="text-muted">· {ago(p.at, now)}</span>
        <span className="ml-auto rounded border border-line px-1 font-mono text-[10px] uppercase text-muted">{p.kind}</span>
      </div>
      {p.inReplyTo && <p className="mt-1 border-l-2 border-line pl-2 text-[12px] text-muted">{p.inReplyTo}</p>}
      <p className="mt-1.5 whitespace-pre-line text-[13px] leading-snug">{p.text}</p>
      <div className="mt-2 flex items-center gap-4 font-mono text-[11px] text-muted">
        <Tick value={p.replies}>↩ {compact(p.replies)}</Tick>
        <Tick value={p.reposts}>↻ {compact(p.reposts)}</Tick>
        <Tick value={p.likes}>♥ {compact(p.likes)}</Tick>
        <Tick value={p.views}>◎ {compact(p.views)}</Tick>
        <a href={p.url} target="_blank" rel="noreferrer" className="link ml-auto">view↗</a>
      </div>
    </li>
  );
}
