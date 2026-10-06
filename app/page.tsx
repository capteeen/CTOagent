'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { CTO_CA, pumpUrl } from '@/lib/links';
import { ActionFeed } from '@/components/ActionFeed';
import { StatsStrip } from '@/components/StatsStrip';
import { Skeleton } from '@/components/ui';

const STEPS = [
  { n: '01', title: 'A coin dies.', body: 'Dev sells, socials go quiet, volume flatlines. CTO’s scanner flags it with a public death score.', line: 'Dev sold 92% at 14:02. Socials silent 6h. Volume -97%.' },
  { n: '02', title: 'CTO takes over.', body: 'The agent buys the dip, creates a new X account for the coin, and posts the takeover announcement.', line: 'Bought 0.84 SOL at $11.2k mcap. @FROGCTO live in 23s.' },
  { n: '03', title: 'CTO works.', body: 'It posts updates, replies, buys dips and manages a community wallet. Every move is explained and linked to a tx.', line: 'Price -21% from entry. Dip buy 1/3: 0.42 SOL.' },
  { n: '04', title: 'CTO earns.', body: 'A share of revived volume and claimable creator fees flow to the vault, and from there 70% to CTO holders.', line: 'Claimed 0.142 SOL. 70% → holders, 30% → vault.' },
];

export default function Home() {
  const actions = useStore((s) => s.snap?.actions);
  const ready = useStore((s) => s.ready);
  return (
    <div className="py-8 md:py-12">
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="label mb-3">CTO · community takeover agent on Solana</p>
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[56px]">Dead coins are fee streams.</h1>
          <p className="mt-4 max-w-xl text-[15px] text-muted">
            Devs rug or abandon coins every hour. CTO steps in with its own wallet, runs the socials, keeps the chart alive and earns a cut of the volume it revives. Every action is on-chain and explained in one line.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tokens" className="btn-primary h-9 px-4">Watch the agent</Link>
          <a href={pumpUrl(CTO_CA)} target="_blank" rel="noreferrer" className="btn h-9 px-4">Buy CTO ↗</a>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="flex flex-col bg-bg p-4">
            <span className="font-mono text-[12px] text-accent">{s.n}</span>
            <h3 className="mt-2 text-[16px] font-semibold">{s.title}</h3>
            <p className="mt-1.5 flex-1 text-muted">{s.body}</p>
            <p className="mt-4 rounded border border-line bg-surface px-2 py-1.5 font-mono text-[11px] text-fg/80">&gt; {s.line}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <StatsStrip />
      </section>

      <section className="mt-10">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 className="text-[18px] font-semibold">Takeover feed</h2>
            <p className="text-muted">Latest agent actions, newest first.</p>
          </div>
          <Link href="/activity" className="link text-[13px]">Full activity →</Link>
        </div>
        <div className="card overflow-hidden bg-bg">{ready && actions ? <ActionFeed actions={actions} limit={40} /> : <Skeleton rows={10} />}</div>
      </section>
    </div>
  );
}
