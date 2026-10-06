// The UI never talks to the simulator directly. It consumes a DataSource that
// pushes Snapshots. Phase 1 = SimSource (in-browser). Phase 2 = LiveSource
// (server-sent events from the scanner/agent backend). Swap in lib/store.ts.

import { seedWorld, SIM_SPEED } from './sim';
import type { Snapshot } from './types';

export type Listener = (snap: Snapshot, freshIds: string[]) => void;

export interface DataSource {
  readonly kind: 'sim' | 'live';
  /** Sim clock speed relative to wall time (1 for live). */
  readonly speed: number;
  start(listener: Listener): () => void;
}

export class SimSource implements DataSource {
  readonly kind = 'sim' as const;
  readonly speed = SIM_SPEED;

  start(listener: Listener) {
    const world = seedWorld(Date.now());
    const first = world.snapshot();
    listener(first.snap, []);
    let last = performance.now();
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      const now = performance.now();
      world.tick(now - last);
      last = now;
      const { snap, fresh } = world.snapshot();
      listener(snap, fresh);
      timer = setTimeout(loop, 2000 + Math.random() * 3000);
    };
    timer = setTimeout(loop, 1200);
    return () => clearTimeout(timer);
  }
}

/**
 * TODO(phase-2): subscribe to the backend's SSE stream. The server owns the
 * scanner (PumpPortal + Helius), the death score, the agent keypair and the X
 * accounts; the browser only renders.
 */
/**
 * Live feed: server-sent events from /api/feed (server/live). The server owns
 * the scanner (DexScreener + pump.fun feed), the death score and the paper
 * agent; the browser only renders. If the feed is unreachable for a while the
 * source falls back to the simulator and says so in Snapshot.source.
 */
export class LiveSource implements DataSource {
  readonly kind = 'live' as const;
  readonly speed = 1;
  constructor(private url = process.env.NEXT_PUBLIC_FEED_URL ?? '/api/feed', private fallbackMs = 15_000) {}

  start(listener: Listener) {
    const es = new EventSource(this.url);
    let got = false;
    let stopSim: (() => void) | null = null;
    let seen = new Set<string>();
    es.addEventListener('snapshot', (e) => {
      got = true;
      if (stopSim) { stopSim(); stopSim = null; }
      const { snap, fresh } = JSON.parse((e as MessageEvent).data) as { snap: Snapshot; fresh: string[] };
      // actions are delivered with the whole snapshot; only flag the ones this tab hasn't seen
      const newIds = seen.size ? fresh.filter((id) => !seen.has(id)) : [];
      seen = new Set(snap.actions.slice(0, 200).map((a) => a.id));
      listener(snap, newIds);
    });
    const fallBack = () => {
      if (got || stopSim) return;
      es.close();
      stopSim = new SimSource().start((snap, fresh) =>
        listener({ ...snap, source: { ...snap.source, notes: ['Live feed unreachable; showing the simulator.', ...snap.source.notes], errors: [`feed: no data from ${this.url}`] } }, fresh),
      );
    };
    // a closed/failed connection before the first snapshot (e.g. 503 when the server runs in sim mode) falls back at once
    es.onerror = () => {
      if (!got && es.readyState === EventSource.CLOSED) fallBack();
    };
    const fallback = setTimeout(fallBack, this.fallbackMs);
    return () => {
      clearTimeout(fallback);
      es.close();
      stopSim?.();
    };
  }
}

export function createSource(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === 'sim' ? new SimSource() : new LiveSource();
}
