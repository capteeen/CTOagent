'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { CTO_CA, pumpUrl } from '@/lib/links';
import { hhmm } from '@/lib/format';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/tokens', label: 'Tokens' },
  { href: '/activity', label: 'Activity' },
  { href: '/agent', label: 'Agent' },
  { href: '/holders', label: 'Holders' },
  { href: '/how', label: 'How it works' },
];

export function Header() {
  const path = usePathname();
  const sweep = useStore((s) => s.snap?.sweep ?? 0);
  const now = useStore((s) => s.snap?.now ?? 0);
  const speed = useStore((s) => s.speed);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-6 w-6 place-items-center rounded bg-fg font-mono text-[10px] font-bold text-bg">CTO</span>
          <span className="hidden sm:inline">CTO</span>
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {NAV.map((n) => {
            const on = path === n.href || (n.href === '/tokens' && path.startsWith('/token/'));
            return (
              <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] ${on ? 'bg-surface text-fg' : 'text-muted hover:text-fg'}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 font-mono text-[11px] text-muted lg:flex" title="Simulated clock. Phase 1 runs on a mock simulator.">
          <span className="h-1.5 w-1.5 rounded-full bg-gain" />
          {speed > 1 ? <span>SIM {speed}×</span> : <span>LIVE</span>}
          {now > 0 && <span className="num">{hhmm(now)} UTC</span>}
        </div>
        <ThemeToggle />
        <a href={pumpUrl(CTO_CA)} target="_blank" rel="noreferrer" className="btn-primary hidden sm:inline-flex">Buy CTO</a>
      </div>
      <div className="relative h-px w-full overflow-hidden bg-line">
        {sweep > 0 && <div key={sweep} className="sweep-bar absolute inset-0 origin-left bg-accent" style={{ animationDuration: '3500ms' }} />}
      </div>
    </header>
  );
}
