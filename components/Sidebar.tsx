'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';

const Mascot = dynamic(() => import('./hq/Mascot').then((m) => m.Mascot), { ssr: false });

const I = {
  home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  tokens: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  agent: <><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M9 12h.01M15 12h.01M12 3v4M8 19v2M16 19v2" /></>,
  holders: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  board: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  how: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01" /></>,
};

export const NAV: { href: string; label: string; icon: keyof typeof I; match?: (p: string) => boolean }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/tokens', label: 'Tokens', icon: 'tokens', match: (p) => p.startsWith('/token') },
  { href: '/activity', label: 'Activity', icon: 'activity' },
  { href: '/agent', label: 'Agent', icon: 'agent' },
  { href: '/leaderboard', label: 'Leaderboard', icon: 'board' },
  { href: '/holders', label: 'Holders', icon: 'holders' },
  { href: '/how', label: 'How it works', icon: 'how' },
];

export function Icon({ name, size = 18 }: { name: keyof typeof I; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {I[name]}
    </svg>
  );
}

export function Sidebar() {
  const path = usePathname();
  const agent = useStore((s) => s.snap?.agent);
  const src = useStore((s) => s.snap?.source);
  return (
    <aside className="sticky top-[89px] hidden h-[calc(100vh-89px)] w-[232px] shrink-0 flex-col border-r border-line bg-bg/70 px-3 py-4 lg:flex">
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const on = path === n.href || n.match?.(path);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-semibold transition-colors ${on ? 'bg-accent text-onaccent' : 'text-fg/80 hover:bg-surface hover:text-fg'}`}
            >
              <Icon name={n.icon} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <div className="card overflow-hidden">
          <div className="h-[132px]"><Mascot /></div>
          <div className="border-t border-line px-3 py-2.5">
            <div className="label">Agent vault</div>
            <div className="num mt-0.5 font-mono text-[14px] font-bold">{agent ? `${agent.vaultSol.toFixed(2)} SOL` : '—'}</div>
            <div className={`num font-mono text-[11px] ${(agent?.pnlTotal ?? 0) >= 0 ? 'text-gain' : 'text-loss'}`}>
              {agent ? `${agent.pnlTotal >= 0 ? '+' : ''}${agent.pnlTotal.toFixed(2)} SOL pnl` : ''}
            </div>
            {src?.paper && <div className="mt-1 font-mono text-[10px] uppercase text-muted">{src.kind === 'live' ? 'paper trading' : 'simulator'}</div>}
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Mobile: horizontal icon bar under the header. */
export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 lg:hidden">
      {NAV.map((n) => {
        const on = path === n.href || n.match?.(path);
        return (
          <Link key={n.href} href={n.href} className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold ${on ? 'bg-accent text-onaccent' : 'text-fg/80'}`}>
            <Icon name={n.icon} size={14} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
