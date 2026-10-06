'use client';

import Link from 'next/link';
import { memo } from 'react';
import { useStore } from '@/lib/store';
import type { Action } from '@/lib/types';
import { ago, stamp } from '@/lib/format';
import { CoinAvatar, KindTag, ProofLink } from './ui';
import { Avatar } from './Avatar';
import { whoDid } from '@/lib/characters';

const Row = memo(function Row({ a, now, fresh, showCoin, compact }: { a: Action; now: number; fresh: boolean; showCoin: boolean; compact: boolean }) {
  const token = useStore((s) => (showCoin ? s.byCa.get(a.ca) : undefined));
  if (compact)
    return (
      <li className={`px-3 py-2.5 ${fresh ? 'animate-slidein' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="num w-9 font-mono text-[11px] text-muted" title={stamp(a.at)}>{ago(a.at, now)}</span>
          <Avatar c={whoDid(a.kind)} size={18} />
          <KindTag kind={a.kind} />
          {showCoin && <Link href={`/token/${a.ca}`} className="font-bold hover:text-accent">${a.ticker}</Link>}
          {a.amount != null && <span className="num font-mono text-[11px]">{a.amount.toFixed(3)} SOL</span>}
          <span className="ml-auto"><ProofLink a={a} /></span>
        </div>
        <p className="mt-1 font-mono text-[12px] leading-snug text-fg/90">{a.reason}</p>
      </li>
    );
  return (
    <li className={`grid grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-1 px-3 py-2.5 md:grid-cols-[52px_96px_auto_1fr_auto_auto] md:items-center ${fresh ? 'animate-slidein' : ''}`}>
      <span className="num font-mono text-[11px] text-muted md:order-none" title={stamp(a.at)}>
        {ago(a.at, now)}
      </span>
      <span className="flex items-center gap-1.5 md:order-none" title={whoDid(a.kind).name}><Avatar c={whoDid(a.kind)} size={20} /><KindTag kind={a.kind} /></span>
      {showCoin ? (
        <Link href={`/token/${a.ca}`} className="col-start-3 row-start-1 flex items-center gap-1.5 justify-self-end font-medium hover:text-accent md:col-start-auto md:row-start-auto md:justify-self-start">
          {token && <CoinAvatar src={token.image} size={18} />}${a.ticker}
        </Link>
      ) : (
        <span className="hidden md:block" />
      )}
      <p className="col-span-3 font-mono text-[12px] leading-snug text-fg/90 md:col-span-1">{a.reason}</p>
      <span className="num hidden text-right font-mono text-[12px] md:block">{a.amount != null ? `${a.amount.toFixed(3)} SOL` : ''}</span>
      <span className="col-span-3 md:col-span-1 md:text-right"><ProofLink a={a} /></span>
    </li>
  );
});

export function ActionFeed({ actions, limit = 50, showCoin = true, compact = false, empty = 'No actions yet.' }: { actions: Action[]; limit?: number; showCoin?: boolean; compact?: boolean; empty?: string }) {
  const now = useStore((s) => s.snap?.now ?? 0);
  const fresh = useStore((s) => s.fresh);
  const list = actions.slice(0, limit);
  if (!list.length) return <p className="px-3 py-6 text-center text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {list.map((a) => (
        <Row key={a.id} a={a} now={now} fresh={fresh.has(a.id)} showCoin={showCoin} compact={compact} />
      ))}
    </ul>
  );
}
