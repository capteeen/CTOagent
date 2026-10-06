'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { CREW } from '@/lib/characters';
import { ago } from '@/lib/format';
import { Avatar } from '../Avatar';
import { Tilt } from '../Tilt';

const TONE: Record<string, string> = { loss: 'text-loss', accent: 'text-accent', fg: 'text-fg', gain: 'text-gain', muted: 'text-muted' };

/** The five characters, each with its live last action and 24h count. */
export function Crew() {
  const actions = useStore((s) => s.snap?.actions);
  const now = useStore((s) => s.snap?.now ?? 0);
  const rows = useMemo(
    () =>
      CREW.map((c) => {
        const mine = (actions ?? []).filter((a) => c.kinds.includes(a.kind));
        const day = mine.filter((a) => now - a.at < 86_400_000).length;
        return { c, last: mine[0], day };
      }),
    [actions, now],
  );
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {rows.map(({ c, last, day }) => (
        <Tilt key={c.role} className="card flex flex-col p-4">
          <div className="flex items-center gap-3">
            <Avatar c={c} size={48} className="rounded-lg" />
            <div className="min-w-0">
              <div className="text-[16px] font-bold leading-tight">{c.name}</div>
              <div className={`font-mono text-[11px] font-semibold uppercase ${TONE[c.tone]}`}>{c.icon} {c.title}</div>
            </div>
          </div>
          <p className="mt-3 text-[13px] text-muted">{c.tagline}</p>
          <div className="mt-3 flex-1 rounded-lg border border-line bg-surface2 px-2.5 py-2 font-mono text-[11px] leading-snug">
            {last ? (
              <>
                <span className="text-muted">{ago(last.at, now)} ago · </span>
                <span className="line-clamp-2 text-fg/85">{last.reason}</span>
              </>
            ) : (
              <span className="text-muted">quiet</span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="num font-mono text-[11px] text-muted">{day} actions · 24h</span>
            <Link href={c.href} className="link text-[12px] font-semibold">Watch →</Link>
          </div>
        </Tilt>
      ))}
    </div>
  );
}
