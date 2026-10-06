'use client';

import { useEffect, useRef, useState } from 'react';
import type { Action, Status } from '@/lib/types';
import { IS_SIM, txUrl } from '@/lib/links';
import { short } from '@/lib/format';

export const STATUS_LABEL: Record<Status, string> = {
  scanning: 'Scanning',
  dying: 'Dying',
  dead: 'Dead',
  taken_over: 'Taken over',
  revived: 'Revived',
  abandoned: 'Abandoned',
};

const STATUS_STYLE: Record<Status, string> = {
  scanning: 'text-muted border-line',
  dying: 'text-loss/80 border-loss/30',
  dead: 'text-loss border-loss/40 bg-loss/5',
  taken_over: 'text-accent border-accent/40 bg-accent/5',
  revived: 'text-gain border-gain/40 bg-gain/5',
  abandoned: 'text-muted border-line bg-surface line-through decoration-muted/40',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex h-5 items-center gap-1 whitespace-nowrap rounded border px-1.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}>
      {status === 'scanning' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DeathBar({ score, threshold = 70, small = false }: { score: number; threshold?: number; small?: boolean }) {
  return (
    <span className={`flex items-center ${small ? 'gap-1.5' : 'gap-2'}`}>
      <span className="num w-6 text-right">{score}</span>
      <span className={`relative h-1.5 overflow-hidden rounded-sm bg-line ${small ? 'w-8' : 'w-16'}`}>
        <span className="absolute inset-y-0 left-0 bg-loss transition-[width] duration-700" style={{ width: `${score}%`, opacity: 0.35 + (score / 100) * 0.65 }} />
        <span className="absolute inset-y-0 w-px bg-fg/40" style={{ left: `${threshold}%` }} />
      </span>
    </span>
  );
}

export function CoinAvatar({ src, size = 28 }: { src: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-md border border-line" />;
}

export function CopyText({ text, display, className = '' }: { text: string; display?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
      className={`group inline-flex items-center gap-1 font-mono text-[11px] text-muted hover:text-fg ${className}`}
      title={`Copy ${text}`}
    >
      {display ?? short(text)}
      <span className="text-[10px] opacity-60 group-hover:opacity-100">{ok ? '✓' : '⧉'}</span>
    </button>
  );
}

/** A number that flashes blue/red when it changes. No bounce. */
export function Tick({ value, children, className = '' }: { value: number; children: React.ReactNode; className?: string }) {
  const prev = useRef(value);
  const [cls, setCls] = useState('');
  const [k, setK] = useState(0);
  useEffect(() => {
    if (value !== prev.current) {
      setCls(value > prev.current ? 'flash-up' : 'flash-down');
      setK((x) => x + 1);
      prev.current = value;
    }
  }, [value]);
  return (
    <span key={k} className={`num ${cls} ${className}`}>
      {children}
    </span>
  );
}

/** Smoothly tween a number to its new value (for stat strips). */
export function useTween(target: number, ms = 800) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  const cur = useRef(target);
  useEffect(() => {
    from.current = cur.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const f = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - f, 3);
      cur.current = from.current + (target - from.current) * e;
      setV(cur.current);
      if (f < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function SimTag() {
  if (!IS_SIM) return null;
  return <span className="ml-1 rounded border border-line px-1 font-mono text-[9px] uppercase text-muted" title="Simulated signature — Phase 1 has no chain writes">sim</span>;
}

export function ProofLink({ a }: { a: Pick<Action, 'txSig' | 'postUrl'> }) {
  if (a.txSig)
    return (
      <a href={txUrl(a.txSig)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="link whitespace-nowrap font-mono text-[11px]">
        tx {a.txSig.slice(0, 6)}↗<SimTag />
      </a>
    );
  if (a.postUrl)
    return (
      <a href={a.postUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="link whitespace-nowrap font-mono text-[11px]">
        post↗<SimTag />
      </a>
    );
  return <span className="whitespace-nowrap font-mono text-[11px] text-muted" title="Scanner observation; the evidence is in the reason">obs</span>;
}

export const KIND_STYLE: Record<Action['kind'], string> = {
  flag: 'text-loss',
  takeover: 'text-accent',
  buy: 'text-accent',
  sell: 'text-gain',
  post: 'text-fg',
  reply: 'text-muted',
  abandon: 'text-muted',
  claim: 'text-gain',
};

export function KindTag({ kind }: { kind: Action['kind'] }) {
  return <span className={`inline-block w-[64px] shrink-0 font-mono text-[11px] font-semibold uppercase ${KIND_STYLE[kind]}`}>{kind}</span>;
}

export function Skeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-11 items-center gap-3 px-3">
          <div className="h-6 w-6 rounded bg-surface" />
          <div className="h-3 w-40 rounded bg-surface" />
          <div className="ml-auto h-3 w-24 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}
