'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { BY_ROLE } from '@/lib/characters';
import { ago, hhmm, usd } from '@/lib/format';
import { CoinAvatar } from '../ui';
import { Avatar } from '../Avatar';

/** Hawk's phone: the newest launches the scanner picked up. Drag to turn it. */
export function Phone() {
  const tokens = useStore((s) => s.snap?.tokens);
  const now = useStore((s) => s.snap?.now ?? 0);
  const list = useMemo(() => (tokens ?? []).filter((t) => t.status === 'scanning' || t.status === 'dying').sort((a, b) => b.launchedAt - a.launchedAt).slice(0, 7), [tokens]);
  const [rot, setRot] = useState({ x: 4, y: -14 });
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const c = BY_ROLE.scanner;
  return (
    <section className="card flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[18px] font-bold"><Avatar c={c} size={26} />{c.name}&apos;s phone</h2>
        <span className="font-mono text-[11px] font-bold text-gain">LIVE</span>
      </div>
      <div
        className="flex flex-1 select-none items-center justify-center py-2"
        style={{ perspective: 1100 }}
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => { if (!drag.current) return; setRot({ x: Math.max(-20, Math.min(20, drag.current.rx - (e.clientY - drag.current.y) * 0.2)), y: Math.max(-45, Math.min(45, drag.current.ry + (e.clientX - drag.current.x) * 0.3)) }); }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <div
          className="relative h-[460px] w-[240px] rounded-[34px] border-[6px] border-[#1a1a1e] bg-[#0b0b0d] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] transition-transform duration-75"
          style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`, transformStyle: 'preserve-3d' }}
        >
          <div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#1a1a1e]" />
          <div className="absolute -right-[9px] top-24 h-14 w-[3px] rounded bg-accent" />
          <div className="flex items-center justify-between px-5 pt-3 font-mono text-[11px] text-[#9a9aa3]"><span>{now ? hhmm(now) : '--:--'}</span><span>▮▮▮ ▰</span></div>
          <div className="px-4 pt-4">
            <div className="text-[20px] font-black leading-none text-white">JUST LAUNCHED</div>
            <div className="mt-1 font-mono text-[10px] text-[#9a9aa3]"><span className="text-accent">●</span> scanner · pump.fun</div>
          </div>
          <ul className="mt-3 space-y-2 px-3">
            {list.map((t) => (
              <li key={t.ca}>
                <Link href={`/token/${t.ca}`} className="flex items-center gap-2.5 rounded-xl bg-[#161619] px-2.5 py-2 hover:bg-[#1f1f24]">
                  <CoinAvatar src={t.image} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-white">{t.name}</div>
                    <div className="truncate font-mono text-[10px] text-[#9a9aa3]">${t.ticker} · {usd(t.mcap)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`num font-mono text-[11px] ${t.deathScore >= 40 ? 'text-loss' : 'text-gain'}`}>{t.deathScore}</div>
                    <div className="num font-mono text-[10px] text-[#9a9aa3]">{ago(t.launchedAt, now)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="absolute bottom-3 left-0 right-0 text-center font-mono text-[10px] text-[#9a9aa3]">tap a coin to open it</div>
        </div>
      </div>
      <p className="mt-2 text-center font-mono text-[10px] text-muted">drag to turn the phone</p>
    </section>
  );
}
