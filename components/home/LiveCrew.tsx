'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { CREW, whoDid, type Role } from '@/lib/characters';
import { ago } from '@/lib/format';
import { Avatar } from '../Avatar';
import { ProofLink } from '../ui';

/** Dark terminal: who is doing what, right now. Filter by character. */
export function LiveCrew() {
  const actions = useStore((s) => s.snap?.actions);
  const now = useStore((s) => s.snap?.now ?? 0);
  const fresh = useStore((s) => s.fresh);
  const [who, setWho] = useState<Role | 'all'>('all');
  const rows = useMemo(() => (actions ?? []).filter((a) => who === 'all' || whoDid(a.kind).role === who).slice(0, 14), [actions, who]);
  const onShift = useMemo(() => CREW.filter((c) => (actions ?? []).some((a) => c.kinds.includes(a.kind) && now - a.at < 3 * 3_600_000)).length, [actions, now]);
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-[#0a0a0c] text-[#e8e8ec]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#232328] px-4 py-2.5">
        <span className="font-mono text-[12px] font-bold text-loss">LIVE</span>
        <span className="font-mono text-[13px] font-bold tracking-wide">CREW, RIGHT NOW</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setWho('all')} className={`rounded-md px-2 py-1 font-mono text-[11px] ${who === 'all' ? 'bg-accent text-onaccent' : 'text-[#9a9aa3] hover:text-white'}`}>all</button>
          {CREW.map((c) => (
            <button key={c.role} onClick={() => setWho(c.role)} title={c.title} className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${who === c.role ? 'bg-accent text-onaccent' : 'text-[#9a9aa3] hover:text-white'}`}>
              <Avatar c={c} size={18} className="!bg-transparent" />
              <span className="hidden font-mono text-[11px] sm:inline">{c.name}</span>
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-[#9a9aa3]">{onShift} on shift</span>
      </div>
      <ul className="max-h-[520px] divide-y divide-[#1c1c20] overflow-y-auto">
        {rows.map((a) => {
          const c = whoDid(a.kind);
          return (
            <li key={a.id} className={`flex gap-3 px-4 py-3 ${fresh.has(a.id) ? 'animate-slidein' : ''}`}>
              <Avatar c={c} size={40} className="rounded-lg !bg-[#1c1c20]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                  <span className="font-bold">{c.name}</span>
                  <span className="font-mono text-[11px] text-[#9a9aa3]">{a.kind} · {ago(a.at, now)} ago</span>
                  <Link href={`/token/${a.ca}`} className="font-mono text-[12px] font-bold text-accent hover:underline">${a.ticker}</Link>
                  {a.amount != null && <span className={`num rounded px-1.5 py-0.5 font-mono text-[11px] ${a.kind === 'sell' || a.kind === 'claim' ? 'bg-gain/15 text-gain' : 'bg-accent/15 text-accent'}`}>{a.kind.toUpperCase()} {a.amount.toFixed(3)} SOL</span>}
                  <ProofLink a={a} />
                </div>
                <p className="mt-1 text-[14px] leading-snug text-[#e8e8ec]/90">{a.reason}</p>
              </div>
            </li>
          );
        })}
        {!rows.length && <li className="px-4 py-8 text-center font-mono text-[12px] text-[#9a9aa3]">nothing from {who} yet</li>}
      </ul>
    </section>
  );
}
