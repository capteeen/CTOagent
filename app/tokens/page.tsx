'use client';

import { useStore } from '@/lib/store';
import { TokensTable } from '@/components/TokensTable';
import { Skeleton } from '@/components/ui';
import { usd } from '@/lib/format';

export default function TokensPage() {
  const ready = useStore((s) => s.ready);
  const agent = useStore((s) => s.snap?.agent);
  const stats = useStore((s) => s.snap?.stats);
  return (
    <div className="pt-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">Tokens</h1>
          <p className="text-muted">Every coin the agent is tracking. Click any number to see the actions behind it.</p>
        </div>
        {agent && stats && (
          <div className="flex gap-5 font-mono text-[12px] text-muted">
            <span>vault <span className="num text-fg">{agent.vaultSol.toFixed(2)} SOL</span></span>
            <span>pnl <span className={`num ${agent.pnlTotal >= 0 ? 'text-accent' : 'text-loss'}`}>{agent.pnlTotal >= 0 ? '+' : ''}{agent.pnlTotal.toFixed(2)} SOL</span></span>
            <span className="hidden sm:inline">revived vol <span className="num text-fg">{usd(stats.volumeRevived)}</span></span>
          </div>
        )}
      </div>
      {ready ? <TokensTable /> : <Skeleton rows={14} />}
    </div>
  );
}
