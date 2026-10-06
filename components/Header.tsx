'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { CTO_CA, pumpUrl } from '@/lib/links';
import { hhmm } from '@/lib/format';
import { ThemeToggle } from './ThemeToggle';
import { CopyText } from './ui';
import { Ticker } from './Ticker';

export function Header() {
  const sweep = useStore((s) => s.snap?.sweep ?? 0);
  const now = useStore((s) => s.snap?.now ?? 0);
  const speed = useStore((s) => s.speed);
  const src = useStore((s) => s.snap?.source);
  const live = src?.kind === 'live';
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-3 md:px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-accent font-mono text-[11px] font-black text-onaccent shadow-[0_3px_0_0_rgb(var(--accent)/0.45)]">
            CTO
            <span className="absolute -top-1 left-1.5 h-1.5 w-1.5 rounded-sm bg-accent" />
            <span className="absolute -top-1 right-1.5 h-1.5 w-1.5 rounded-sm bg-accent" />
          </span>
          <span className="text-[18px] font-black tracking-tight">
            CT<span className="text-accent">O</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className={`chip hidden sm:inline-flex ${live ? 'border-gain/40 text-gain' : 'border-line text-muted'}`} title={src?.notes.join('\n')}>
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-gain' : 'bg-muted'}`} />
            {live ? 'MAINNET · LIVE' : `SIM ${speed}×`}
          </span>
          {src?.paper && live && <span className="chip hidden border-accent/40 text-accent md:inline-flex">PAPER</span>}
          {now > 0 && <span className="chip num hidden lg:inline-flex">{hhmm(now)} UTC</span>}
          <span className="chip hidden md:inline-flex">
            <span className="text-accent">CA</span>
            <CopyText text={CTO_CA} display={`${CTO_CA.slice(0, 5)}…${CTO_CA.slice(-4)}`} className="!text-fg" />
          </span>
          <ThemeToggle />
          <a href={pumpUrl(CTO_CA)} target="_blank" rel="noreferrer" className="btn-primary">Buy CTO</a>
        </div>
      </div>
      <div className="relative h-px w-full overflow-hidden bg-line">
        {sweep > 0 && <div key={sweep} className="sweep-bar absolute inset-0 origin-left bg-accent" style={{ animationDuration: live ? '4000ms' : '3500ms' }} />}
      </div>
      <Ticker />
    </header>
  );
}
