'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { AGENT_WALLET, accountUrl } from '@/lib/links';
import { SCORE_WEIGHTS } from '@/lib/score';
import { usd } from '@/lib/format';
import { ActionFeed } from '@/components/ActionFeed';
import { CopyText, Skeleton, useTween } from '@/components/ui';
import { HQ } from '@/components/hq/HQ';

function Big({ label, value, fmt, cls = '', sub }: { label: string; value: number; fmt: (n: number) => string; cls?: string; sub?: string }) {
  const v = useTween(value);
  return (
    <div className="bg-bg px-4 py-3">
      <div className="label">{label}</div>
      <div className={`num mt-1 text-[22px] font-semibold tracking-tight ${cls}`}>{fmt(v)}</div>
      {sub && <div className="num mt-0.5 font-mono text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export default function AgentPage() {
  const snap = useStore((s) => s.snap);
  const trades = useMemo(() => (snap?.actions ?? []).filter((a) => ['takeover', 'buy', 'sell', 'abandon', 'claim'].includes(a.kind)), [snap?.actions]);
  if (!snap) return <div className="py-6"><Skeleton rows={12} /></div>;
  const { agent, tokens } = snap;
  const r = agent.rules;
  const open = tokens.filter((t) => t.status === 'taken_over');
  const deployed = open.reduce((s, t) => s + t.position.sol, 0) + tokens.filter((t) => t.status === 'revived').reduce((s, t) => s + t.position.sol, 0);
  const winRate = agent.takeovers ? (agent.revived / agent.takeovers) * 100 : 0;
  const decided = agent.revived + agent.abandoned;

  const scannerRules = [
    `Death score = ${SCORE_WEIGHTS.dev.pts} pts if the dev wallet sold ≥${SCORE_WEIGHTS.dev.threshold}% + ${SCORE_WEIGHTS.social.pts} pts if no X/TG activity for ${SCORE_WEIGHTS.social.threshold}h+ + ${SCORE_WEIGHTS.volume.pts} pts if 24h volume is down ≥${SCORE_WEIGHTS.volume.threshold}% from peak + ${SCORE_WEIGHTS.holders.pts} pts if holders are down ≥${SCORE_WEIGHTS.holders.threshold}% from peak. Partial credit is linear up to each threshold.`,
    `A coin is eligible when its score is ≥${r.deathThreshold} and market cap is between ${usd(r.mcapMin, 0)} and ${usd(r.mcapMax, 0)}.`,
    `It must have ≥${r.minHolders} holders, no dev-bundle flags at launch, and pass a sell simulation (no honeypots).`,
  ];
  const strategy: [string, string][] = [
    ['Initial buy', `${r.initialBuyPct}% of vault, max ${r.maxInitialSol} SOL`],
    ['Dip buys', `every -${r.dipStepPct}% from takeover price, up to ${r.dipBuys}×, ½ initial size`],
    ['Exit', `sell ${r.exitSellPct}% at ${r.exitMultiple}x from takeover price, hold the rest`],
    ['Abandon', `after ${r.abandonHours}h if 24h volume is not ≥ +200% vs takeover; sell all`],
    ['Posting', `announcement within 60s, update every ${r.updateEveryHours}h, reply to mentions`],
    ['Revenue split', `${r.holderSharePct}% to CTO holders, ${100 - r.holderSharePct}% to vault`],
    ['LLM', 'writes posts and reasons only; never decides trades'],
  ];

  return (
    <div className="py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">The agent</h1>
          <div className="mt-1 flex items-center gap-2 text-muted">
            wallet <CopyText text={AGENT_WALLET} display={AGENT_WALLET} />
            <a href={accountUrl(AGENT_WALLET)} target="_blank" rel="noreferrer" className="link text-[12px]">solscan↗</a>
          </div>
        </div>
        <Link href="/activity" className="btn">All activity →</Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3 lg:grid-cols-6">
        <Big label="Total SOL" value={agent.vaultSol + deployed} fmt={(n) => `${n.toFixed(2)}`} sub={`${agent.vaultSol.toFixed(2)} vault + ${deployed.toFixed(2)} in coins`} />
        <Big label="PnL" value={agent.pnlTotal} fmt={(n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)} SOL`} cls={agent.pnlTotal >= 0 ? 'text-accent' : 'text-loss'} sub="realized + unrealized" />
        <Big label="Win rate" value={winRate} fmt={(n) => `${n.toFixed(0)}%`} sub={`${agent.revived} revived / ${agent.takeovers} taken over`} />
        <Big label="Takeovers" value={agent.takeovers} fmt={(n) => Math.round(n).toString()} sub={`${open.length} active · ${decided} decided`} />
        <Big label="Abandoned" value={agent.abandoned} fmt={(n) => Math.round(n).toString()} sub={`${agent.takeovers ? ((agent.abandoned / agent.takeovers) * 100).toFixed(0) : 0}% of takeovers`} />
        <Big label="Paid to holders" value={agent.feesPaidToHolders} fmt={(n) => `${n.toFixed(2)} SOL`} cls="text-gain" sub={`${agent.pendingToHolders.toFixed(3)} SOL pending`} />
      </div>

      <HQ className="mt-4 h-[300px] md:h-[380px]" />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="border-b border-line px-4 py-2"><h2 className="text-[14px] font-semibold">Scanner rules</h2></div>
          <ol className="divide-y divide-line">
            {scannerRules.map((s, i) => (
              <li key={i} className="flex gap-3 px-4 py-2.5 font-mono text-[12px] leading-relaxed"><span className="text-accent">{String(i + 1).padStart(2, '0')}</span><span>{s}</span></li>
            ))}
          </ol>
        </section>
        <section className="card">
          <div className="border-b border-line px-4 py-2"><h2 className="text-[14px] font-semibold">Current strategy parameters</h2></div>
          <dl className="divide-y divide-line">
            {strategy.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 font-mono text-[12px]"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </section>
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-line px-4 py-2"><h2 className="text-[14px] font-semibold">Wallet activity</h2></div>
        <ActionFeed actions={trades} limit={60} />
      </section>
    </div>
  );
}
