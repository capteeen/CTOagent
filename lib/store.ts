'use client';

import { create } from 'zustand';
import type { Evidence, Snapshot, Token } from './types';

export interface EvidenceTarget {
  ca: string;
  field: Evidence | 'pnl' | 'vol24h' | 'volDelta';
}

interface State {
  ready: boolean;
  snap: Snapshot | null;
  byCa: Map<string, Token>;
  /** action ids that arrived after page load; used for slide-in motion */
  fresh: Set<string>;
  speed: number;
  evidence: EvidenceTarget | null;
  apply: (snap: Snapshot, fresh: string[], speed: number) => void;
  openEvidence: (t: EvidenceTarget | null) => void;
}

export const useStore = create<State>((set, get) => ({
  ready: false,
  snap: null,
  byCa: new Map(),
  fresh: new Set(),
  speed: 1,
  evidence: null,
  apply: (snap, freshIds, speed) => {
    const fresh = new Set(get().fresh);
    for (const id of freshIds) fresh.add(id);
    if (fresh.size > 2000) {
      const keep = Array.from(fresh).slice(-1000);
      fresh.clear();
      keep.forEach((k) => fresh.add(k));
    }
    set({ snap, ready: true, byCa: new Map(snap.tokens.map((t) => [t.ca, t])), fresh, speed });
  },
  openEvidence: (evidence) => set({ evidence }),
}));

export const useSnap = () => useStore((s) => s.snap);
export const useNow = () => useStore((s) => s.snap?.now ?? 0);
