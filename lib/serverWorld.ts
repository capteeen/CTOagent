import 'server-only';
import { seedWorld } from './sim';
import type { Snapshot, Token } from './types';

// The simulator is deterministic for a given seed, so the server can rebuild
// the same coins (same CAs) the browser sees. Used for metadata + OG images.
// TODO(phase-2): read from the database instead.
let cache: { snap: Snapshot; at: number } | null = null;

export function serverSnapshot(): Snapshot {
  if (!cache || Date.now() - cache.at > 10 * 60_000) cache = { snap: seedWorld(Date.now()).snapshot().snap, at: Date.now() };
  return cache.snap;
}

export function serverToken(ca: string): Token | undefined {
  return serverSnapshot().tokens.find((t) => t.ca === ca);
}
