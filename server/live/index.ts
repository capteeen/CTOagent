import 'server-only';
import { LiveWorld } from './world';

// Live is the default; set NEXT_PUBLIC_DATA_SOURCE=sim (or DATA_SOURCE=sim) for the simulator.
export const LIVE = process.env.DATA_SOURCE !== 'sim' && process.env.NEXT_PUBLIC_DATA_SOURCE !== 'sim';

// One world per Node process (survives Next's dev HMR via globalThis).
// This needs a long-lived server (`next start`, Docker, a VPS). On serverless
// hosts each invocation would start cold; run the world as a separate
// process there and point NEXT_PUBLIC_FEED_URL at it.
const g = globalThis as unknown as { __ctoLive?: LiveWorld };

export function getLiveWorld(): LiveWorld {
  if (!g.__ctoLive) {
    g.__ctoLive = new LiveWorld({
      heliusKey: process.env.HELIUS_API_KEY || undefined,
      watchlist: (process.env.LIVE_WATCH ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      paperVaultSol: Number(process.env.LIVE_PAPER_VAULT_SOL ?? 10),
      relaxHolders: process.env.LIVE_RELAX_HOLDERS === '1',
      maxTokens: Number(process.env.LIVE_MAX_TOKENS ?? 300),
    });
  }
  return g.__ctoLive;
}
