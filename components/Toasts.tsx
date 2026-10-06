'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Action } from '@/lib/types';
import { KindTag, ProofLink } from './ui';
import { Avatar } from './Avatar';
import { whoDid } from '@/lib/characters';

const BIG: Action['kind'][] = ['takeover', 'sell', 'abandon', 'claim'];

/** Pops the agent's big moves (takeover, exit, abandon, claim) as they happen. */
export function Toasts() {
  const actions = useStore((s) => s.snap?.actions);
  const seen = useRef<Set<string> | null>(null);
  const [items, setItems] = useState<Action[]>([]);
  useEffect(() => {
    if (!actions) return;
    if (!seen.current) {
      seen.current = new Set(actions.map((a) => a.id));
      return;
    }
    const fresh = actions.filter((a) => !seen.current!.has(a.id) && BIG.includes(a.kind));
    for (const a of actions) seen.current.add(a.id);
    if (!fresh.length) return;
    setItems((cur) => [...fresh.slice(0, 2), ...cur].slice(0, 3));
    for (const a of fresh.slice(0, 2)) setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== a.id)), 7000);
  }, [actions]);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((a) => (
        <Link
          key={a.id}
          href={`/token/${a.ca}`}
          onClick={() => setItems((cur) => cur.filter((x) => x.id !== a.id))}
          className={`pointer-events-auto animate-slidein rounded-xl border bg-surface p-3 shadow-lg ${a.kind === 'takeover' ? 'border-accent' : a.kind === 'sell' || a.kind === 'claim' ? 'border-gain' : 'border-line'}`}
        >
          <div className="flex items-center gap-2">
            <Avatar c={whoDid(a.kind)} size={24} />
            <KindTag kind={a.kind} />
            <span className="font-bold">${a.ticker}</span>
            {a.amount != null && <span className="num font-mono text-[11px] text-muted">{a.amount.toFixed(3)} SOL</span>}
            <span className="ml-auto"><ProofLink a={a} /></span>
          </div>
          <p className="mt-1 line-clamp-2 font-mono text-[11px] leading-snug text-fg/85">{a.reason}</p>
        </Link>
      ))}
    </div>
  );
}
