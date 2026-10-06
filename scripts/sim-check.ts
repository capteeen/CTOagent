// Quick headless check of the simulator: node --experimental-strip-types not needed, run via npx tsx
import { seedWorld } from '../lib/sim';
const t0 = performance.now();
const w = seedWorld(1_760_000_000_000);
const t1 = performance.now();
const count = (s: ReturnType<typeof w.snapshot>['snap']) => s.tokens.reduce((m, t) => ((m[t.status] = (m[t.status] ?? 0) + 1), m), {} as Record<string, number>);
let { snap } = w.snapshot();
console.log('seed ms', (t1 - t0).toFixed(0), 'tokens', snap.tokens.length, count(snap), 'actions', snap.actions.length);
console.log('agent', { vault: snap.agent.vaultSol.toFixed(2), pnl: snap.agent.pnlTotal.toFixed(2), tk: snap.agent.takeovers, rev: snap.agent.revived, ab: snap.agent.abandoned, paid: snap.agent.feesPaidToHolders.toFixed(3) });
for (const a of snap.actions.slice(0, 8)) console.log(a.kind.padEnd(8), a.ticker.padEnd(9), a.reason);
for (let i = 0; i < 1200; i++) w.tick(3000); // ~60 real min
snap = w.snapshot().snap;
console.log('after 1h:', snap.tokens.length, count(snap), 'actions', snap.actions.length);
console.log('agent', { vault: snap.agent.vaultSol.toFixed(2), pnl: snap.agent.pnlTotal.toFixed(2), tk: snap.agent.takeovers, rev: snap.agent.revived, ab: snap.agent.abandoned, paid: snap.agent.feesPaidToHolders.toFixed(3), dists: snap.distributions.length });
const kinds: Record<string, number> = {}; for (const a of snap.actions.slice(0, 200)) kinds[a.kind] = (kinds[a.kind] ?? 0) + 1; console.log('last 200 kinds', kinds);
for (const k of ['takeover','buy','sell','abandon','claim','reply','post']) { const a = snap.actions.find(x=>x.kind===k); if (a) console.log(k, '|', a.reason); }
const t = snap.tokens.find(t=>t.status==='revived')!; console.log(snap.postsByCa[t.ca][0]?.text);
const why: Record<string, number> = {};
for (const t of snap.tokens) if (t.status === 'dead') for (const r of t.eligibility?.reasons ?? ['eligible/pending']) { const k = r.replace(/[\d.$k]+/g, '#'); why[k] = (why[k] ?? 0) + 1; }
console.log(why);
