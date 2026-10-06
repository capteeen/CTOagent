'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useStore, type EvidenceTarget } from '@/lib/store';
import { SCORE_WEIGHTS, scoreParts } from '@/lib/score';
import type { Action, Token } from '@/lib/types';
import { hours, pct, short, sol, SOL_USD, usd } from '@/lib/format';
import { accountUrl } from '@/lib/links';
import { SUPPLY } from '@/lib/sim';
import { ActionFeed } from './ActionFeed';
import { CoinAvatar, StatusBadge } from './ui';

const TITLES: Record<EvidenceTarget['field'], string> = {
  score: 'Death score',
  dev: 'Dev sold %',
  social: 'Hours silent',
  volume: 'Volume',
  vol24h: 'Volume 24h',
  volDelta: 'Volume Δ since takeover',
  holders: 'Holders',
  position: 'Agent position',
  pnl: 'PnL',
  fees: 'Fees earned',
};

const FIELD_TAGS: Record<EvidenceTarget['field'], (a: Action) => boolean> = {
  score: (a) => a.tags.includes('score'),
  dev: (a) => a.tags.includes('dev'),
  social: (a) => a.tags.includes('social'),
  volume: (a) => a.tags.includes('volume'),
  vol24h: (a) => a.tags.includes('volume'),
  volDelta: (a) => a.tags.includes('volume') || a.kind === 'takeover',
  holders: (a) => a.tags.includes('holders'),
  position: (a) => a.tags.includes('position'),
  pnl: (a) => ['takeover', 'buy', 'sell', 'abandon'].includes(a.kind),
  fees: (a) => a.kind === 'claim' || (a.kind === 'sell' && a.tags.includes('fees')),
};

function Line({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 font-mono text-[12px]">
      <span className="text-muted">{k}</span>
      <span className={`num text-right ${strong ? 'font-semibold' : ''}`}>{v}</span>
    </div>
  );
}

function Breakdown({ t, field, now }: { t: Token; field: EvidenceTarget['field']; now: number }) {
  const p = scoreParts(t);
  const W = SCORE_WEIGHTS;
  switch (field) {
    case 'score':
      return (
        <>
          <Line k={`${W.dev.label} (${W.dev.pts})`} v={`${t.devSoldPct.toFixed(0)}% → ${p.dev.toFixed(1)}`} />
          <Line k={`${W.social.label} (${W.social.pts})`} v={`${hours(t.hoursSilent)} → ${p.social.toFixed(1)}`} />
          <Line k={`${W.volume.label} (${W.volume.pts})`} v={`-${p.volDropPct.toFixed(0)}% → ${p.volume.toFixed(1)}`} />
          <Line k={`${W.holders.label} (${W.holders.pts})`} v={`-${p.holdersDropPct.toFixed(0)}% → ${p.holders.toFixed(1)}`} />
          <Line k="Total" v={`${t.deathScore} / 100`} strong />
          {t.eligibility && (
            <p className={`mt-2 font-mono text-[12px] ${t.eligibility.ok ? 'text-accent' : 'text-loss'}`}>
              {t.eligibility.ok ? 'Eligible: score ≥70, mcap $5k-$50k, ≥150 holders, no bundle/honeypot.' : `Not eligible: ${t.eligibility.reasons.join('; ')}.`}
            </p>
          )}
        </>
      );
    case 'dev':
      return (
        <>
          <Line k="Dev wallet" v={t.devWallet ? <a className="link" href={accountUrl(t.devWallet)} target="_blank" rel="noreferrer">{short(t.devWallet, 6)}↗</a> : 'unknown'} />
          <Line k="Sold of initial holdings" v={`${t.devSoldPct.toFixed(1)}%`} strong />
          <Line k="Score contribution" v={`${p.dev.toFixed(1)} / 35`} />
        </>
      );
    case 'social':
      return (
        <>
          <Line k="Last X/TG activity" v={`${hours(t.hoursSilent)} ago`} strong />
          <Line k="CTO account" v={t.xHandle ? `@${t.xHandle}` : 'none yet'} />
          <Line k="Score contribution" v={`${p.social.toFixed(1)} / 25`} />
        </>
      );
    case 'volume':
    case 'vol24h':
    case 'volDelta': {
      const d = t.volAtTakeover ? (t.vol24h / t.volAtTakeover - 1) * 100 : null;
      return (
        <>
          <Line k="Volume 24h" v={usd(t.vol24h)} strong={field === 'vol24h'} />
          <Line k="Peak 24h volume" v={usd(t.volPeak)} />
          <Line k="Down from peak" v={`-${p.volDropPct.toFixed(1)}%`} />
          {t.volAtTakeover != null && <Line k="24h vol at takeover" v={usd(t.volAtTakeover)} />}
          {d != null && <Line k="Δ since takeover" v={pct(d, 0, true)} strong={field === 'volDelta'} />}
          {t.takeoverAt && <Line k="Cumulative since takeover" v={usd(t.volSinceTakeover)} />}
        </>
      );
    }
    case 'holders':
      return (
        <>
          <Line k="Holders" v={t.holdersPeak ? t.holders : 'unknown'} strong />
          <Line k="Peak holders" v={t.holdersPeak || '—'} />
          <Line k="Down from peak" v={`-${p.holdersDropPct.toFixed(1)}%`} />
        </>
      );
    case 'position':
    case 'pnl': {
      const pos = t.position;
      const unreal = pos.sol - pos.cost;
      return (
        <>
          <Line k="Tokens held" v={`${(pos.tokens / 1e6).toFixed(2)}M ${t.ticker}`} />
          <Line k="Mark price × held" v={`${usd(t.mcap)} mcap → ${sol(pos.sol)}`} strong={field === 'position'} />
          <Line k="Avg entry (mcap)" v={pos.avgPrice ? usd(pos.avgPrice * SUPPLY) : '—'} />
          <Line k="Cost basis remaining" v={sol(pos.cost)} />
          <Line k="Unrealized" v={sol(unreal)} />
          <Line k="Realized" v={sol(pos.realized)} />
          <Line k="PnL = realized + unrealized" v={`${pos.pnl >= 0 ? '+' : ''}${sol(pos.pnl)}`} strong={field === 'pnl'} />
          <p className="mt-1 font-mono text-[11px] text-muted">Mark uses 1 SOL = ${SOL_USD} (sim).</p>
        </>
      );
    }
    case 'fees':
      return (
        <>
          <Line k="Creator fees claimable" v={t.flags.creatorFeesClaimable ? 'yes' : 'no'} />
          <Line k="Fees claimed" v={sol(t.feesEarned)} strong />
          <Line k="→ holders (70%)" v={sol(t.feesEarned * 0.7)} />
          <Line k="→ vault (30%)" v={sol(t.feesEarned * 0.3)} />
        </>
      );
  }
  void now;
  return null;
}

export function EvidenceDrawer() {
  const ev = useStore((s) => s.evidence);
  const close = () => useStore.getState().openEvidence(null);
  const t = useStore((s) => (ev ? s.byCa.get(ev.ca) : undefined));
  const actions = useStore((s) => (ev ? s.snap?.actionsByCa[ev.ca] : undefined));
  const now = useStore((s) => s.snap?.now ?? 0);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  if (!ev || !t) return null;
  const filtered = (actions ?? []).filter(FIELD_TAGS[ev.field]);
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-fg/10" onClick={close} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-line bg-bg shadow-sm">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <CoinAvatar src={t.image} size={28} />
          <div className="min-w-0 flex-1">
            <div className="label">Evidence</div>
            <div className="truncate font-semibold">
              {TITLES[ev.field]} · ${t.ticker}
            </div>
          </div>
          <StatusBadge status={t.status} />
          <button onClick={close} className="btn h-7 w-7 px-0" aria-label="Close">✕</button>
        </div>
        <div className="border-b border-line px-4 py-3">
          <div className="label mb-1">How this number is computed</div>
          <div className="divide-y divide-line">
            <Breakdown t={t} field={ev.field} now={now} />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <div className="label">Actions that produced it · {filtered.length}</div>
          <Link href={`/token/${t.ca}`} onClick={close} className="link text-[12px]">Open token →</Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ActionFeed actions={filtered} limit={200} showCoin={false} compact empty="No actions behind this number yet." />
        </div>
      </aside>
    </div>
  );
}
