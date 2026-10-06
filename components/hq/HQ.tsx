'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Action } from '@/lib/types';
import { ActionFeed } from '@/components/ActionFeed';
import type { Role } from './Scene';
import { CREW, BY_ROLE } from '@/lib/characters';
import { Avatar } from '@/components/Avatar';

const Scene = dynamic(() => import('./Scene').then((m) => m.Scene), { ssr: false, loading: () => null });

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const ROLE = Object.fromEntries(CREW.map((c) => [c.role, { title: `${c.name} · ${c.title}`, blurb: c.blurb, kinds: c.kinds, href: c.href }])) as Record<Role, { title: string; blurb: string; kinds: Action['kind'][]; href: string }>;

/** The CTO HQ: five voxel agents working the live feed. Click one to open its log. */
export function HQ({ className = '' }: { className?: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const [sel, setSel] = useState<Role | null>(null);
  const actions = useStore((s) => s.snap?.actions);
  useEffect(() => setOk(webglOk()), []);
  const list = useMemo(() => (sel ? (actions ?? []).filter((a) => ROLE[sel].kinds.includes(a.kind)) : []), [sel, actions]);
  if (ok === false) return null;
  return (
    <div className={`hq relative overflow-hidden rounded-xl border border-line ${className}`}>
      {ok === null ? <div className="absolute inset-0 animate-pulse bg-surface" /> : <Scene className="absolute inset-0 h-full w-full" onSelect={setSel} />}
      {sel && (
        <div className="absolute inset-y-0 right-0 flex w-full max-w-[380px] flex-col border-l border-line bg-bg/95 backdrop-blur animate-slidein">
          <div className="flex items-start gap-2 border-b border-line px-3 py-2.5">
            <Avatar c={BY_ROLE[sel]} size={36} className="rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold">{ROLE[sel].title}</div>
              <p className="text-[11px] leading-snug text-muted">{ROLE[sel].blurb}</p>
            </div>
            <Link href={ROLE[sel].href} className="btn h-7 px-2 text-[11px]">Open →</Link>
            <button onClick={() => setSel(null)} className="btn h-7 w-7 px-0" aria-label="Close">✕</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ActionFeed actions={list} limit={25} compact empty="Nothing yet." />
          </div>
        </div>
      )}
    </div>
  );
}
