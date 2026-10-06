'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { ActionKind } from '@/lib/types';
import { ActionFeed } from '@/components/ActionFeed';
import { KIND_STYLE, Skeleton } from '@/components/ui';

const KINDS: ActionKind[] = ['flag', 'takeover', 'buy', 'sell', 'post', 'reply', 'claim', 'abandon'];

export default function ActivityPage() {
  const actions = useStore((s) => s.snap?.actions);
  const [on, setOn] = useState<Set<ActionKind>>(new Set(KINDS));
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(150);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase().replace('$', '');
    return (actions ?? []).filter((a) => on.has(a.kind) && (!s || a.ticker.toLowerCase().includes(s) || a.ca.toLowerCase().includes(s) || a.reason.toLowerCase().includes(s)));
  }, [actions, on, q]);
  const toggle = (k: ActionKind) => setOn((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="pt-5">
      <h1 className="text-[22px] font-semibold">Activity</h1>
      <p className="text-muted">Every agent action and scanner observation, newest first. Each one links to a tx or a post.</p>
      <div className="sticky top-[89px] z-10 -mx-4 mt-4 flex flex-wrap items-center gap-1.5 border-b border-line bg-bg px-4 py-2 md:-mx-6 md:px-6">
        {KINDS.map((k) => (
          <button key={k} onClick={() => toggle(k)} className={`btn h-7 px-2 font-mono text-[11px] uppercase ${on.has(k) ? KIND_STYLE[k] : 'text-muted/50 line-through'}`}>{k}</button>
        ))}
        <button onClick={() => setOn(new Set(on.size === KINDS.length ? ['takeover', 'buy', 'sell', 'abandon', 'claim'] : KINDS))} className="btn h-7 px-2 text-[11px]">
          {on.size === KINDS.length ? 'Trades only' : 'All kinds'}
        </button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter ticker, CA or text" className="ml-auto h-7 w-full rounded-md border border-line bg-bg px-2 font-mono text-[12px] outline-none focus:border-accent sm:w-64" />
      </div>
      <div className="card mt-3 overflow-hidden">
        {actions ? <ActionFeed actions={filtered} limit={limit} empty="Nothing matches these filters." /> : <Skeleton rows={14} />}
      </div>
      {filtered.length > limit && (
        <div className="mt-3 text-center"><button className="btn" onClick={() => setLimit((l) => l + 150)}>Load more ({filtered.length - limit})</button></div>
      )}
    </div>
  );
}
