'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';

/** Says where the numbers come from and what is paper. Collapsible. */
export function SourceBanner() {
  const src = useStore((s) => s.snap?.source);
  const n = useStore((s) => s.snap?.tokens.length ?? 0);
  const [open, setOpen] = useState(false);
  if (!src) return null;
  const bad = src.errors.length > 0;
  const live = src.kind === 'live';
  return (
    <div className={`mb-4 rounded-xl border px-3 py-2 text-[12px] ${bad ? 'border-loss/40 bg-loss/5' : live ? 'border-gain/30 bg-gain/5' : 'border-line bg-surface'}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <span className={`h-1.5 w-1.5 rounded-full ${bad ? 'bg-loss' : live ? 'bg-gain' : 'bg-muted'}`} />
        <span className="font-mono">
          {live ? `LIVE · ${n} real tokens tracked` : 'SIMULATOR · generated coins'}
          {src.paper && live ? ' · agent trades on PAPER' : ''}
          {bad ? ` · ${src.errors.length} data source error${src.errors.length > 1 ? 's' : ''}` : ''}
        </span>
        <span className="ml-auto text-muted">{open ? 'hide' : 'details'}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-0.5 border-t border-line pt-2 font-mono text-[11px] text-muted">
          {src.notes.map((x) => <li key={x}>· {x}</li>)}
          {src.errors.map((x) => <li key={x} className="text-loss">! {x}</li>)}
        </ul>
      )}
    </div>
  );
}
