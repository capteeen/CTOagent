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
export class LiveSource implements DataSource {
  readonly kind = 'live' as const;
  readonly speed = 1;
  constructor(private url = process.env.NEXT_PUBLIC_FEED_URL ?? '/api/feed') {}

  start(listener: Listener) {
    const es = new EventSource(this.url);
    es.addEventListener('snapshot', (e) => {
      const { snap, fresh } = JSON.parse((e as MessageEvent).data) as { snap: Snapshot; fresh: string[] };
      listener(snap, fresh);
    });
    return () => es.close();
  }
}

export function createSource(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === 'live' ? new LiveSource() : new SimSource();
}
