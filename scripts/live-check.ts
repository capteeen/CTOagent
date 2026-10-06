// Offline exercise of the live world: fake DexScreener + fake PumpPortal socket.
// Run: npx tsx scripts/live-check.ts
import { LiveWorld } from '../server/live/world';
import type { SocketLike } from '../server/live/pumpportal';

let now = 1_760_000_000_000;
const clock = () => now;
const MINT = 'FrogDeadCoin1111111111111111111111111111pump';
const DEV = 'DevWa11et11111111111111111111111111111111111';
const B = 'BoostedCoin11111111111111111111111111111111';

const pairFor = (ca: string, o: Partial<{ price: number; h24: number; h1: number; m5: number; mcap: number }> = {}) => ({
  chainId: 'solana', dexId: 'pumpfun', pairAddress: 'p' + ca.slice(0, 6),
  baseToken: { address: ca, name: ca === MINT ? 'Dead Frog' : 'Boosted', symbol: ca === MINT ? 'DFROG' : 'BOOST' },
  quoteToken: { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
  priceUsd: String(o.price ?? 0.00002), marketCap: o.mcap ?? 20_000, fdv: o.mcap ?? 20_000,
  txns: { m5: { buys: o.m5 ?? 1, sells: 0 }, h1: { buys: (o.h1 ?? 2000) > 0 ? 5 : 0, sells: 0 }, h6: { buys: 30, sells: 10 }, h24: { buys: 100, sells: 40 } },
  volume: { m5: 100, h1: o.h1 ?? 2000, h6: 10000, h24: o.h24 ?? 40_000 }, liquidity: { usd: 8000 }, pairCreatedAt: now - 20 * 3_600_000,
  info: { imageUrl: 'https://example.invalid/img.png' },
});
let pairs: Record<string, unknown> = { [MINT]: pairFor(MINT), [B]: pairFor(B, { price: 0.001, mcap: 1_000_000, h24: 500_000 }) };

const calls: string[] = [];
const fakeFetch: typeof fetch = async (url) => {
  const u = String(url);
  calls.push(u);
  const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.includes('/token-profiles/latest')) return json([{ chainId: 'solana', tokenAddress: B, icon: 'https://example.invalid/b.png' }, { chainId: 'ethereum', tokenAddress: '0xabc' }]);
  if (u.includes('/token-boosts/')) return json([]);
  if (u.includes('/tokens/v1/solana/')) {
    const cas = u.split('/tokens/v1/solana/')[1].split(',');
    return json(cas.flatMap((c) => (pairs[c] ? [pairs[c]] : [])));
  }
  return new Response('nope', { status: 404 });
};

let sock!: SocketLike & { sent: string[] };
const factory = () => {
  let opened = false;
  sock = { sent: [], send: (d) => { if (!opened) throw new Error('Sent before connected.'); sock.sent.push(d); }, close: () => {}, onopen: null, onmessage: null, onclose: null, onerror: null };
  setTimeout(() => { opened = true; sock.onopen?.({}); }, 0);
  return sock;
};
const emit = (m: unknown) => sock.onmessage?.({ data: JSON.stringify(m) });

(async () => {
  const w = new LiveWorld({ fetchFn: fakeFetch, socketFactory: factory, now: clock, manual: true, relaxHolders: true, paperVaultSol: 10 });
  w.start();
  await new Promise((r) => setTimeout(r, 10));
  await w.discover();
  console.log('tracked after discover:', w.tokens.map((t) => `${t.ticker} ${t.mcap}`));
  console.assert(w.tokens.length === 1 && w.tokens[0].ticker === 'BOOST', 'discovery picks solana profiles only');
  console.assert(sock.sent.some((s) => s.includes('subscribeNewToken')), 'subscribes to launches');

  // a pump.fun launch arrives
  emit({ txType: 'create', signature: 'sigCreate', mint: MINT, traderPublicKey: DEV, name: 'Dead Frog', symbol: 'DFROG', initialBuy: 50_000_000, solAmount: 1.5, marketCapSol: 30 });
  await w.refresh([MINT]);
  const t = w.tokens.find((x) => x.ca === MINT)!;
  console.log('launch:', t.ticker, 'dev', t.devWallet.slice(0, 6), 'mcap', t.mcap, 'score', t.deathScore);
  console.assert(sock.sent.some((s) => s.includes('subscribeAccountTrade') && s.includes(DEV)), 'watches dev wallet');

  // dev dumps 92%
  emit({ txType: 'sell', signature: 'sigDevSell', mint: MINT, traderPublicKey: DEV, tokenAmount: 46_000_000, solAmount: 1.1, marketCapSol: 12 });
  console.log('after dev sell: devSold', t.devSoldPct.toFixed(0), '| last:', t.lastAction.reason, '| tx', t.lastAction.txSig);
  console.assert(t.lastAction.txSig === 'sigDevSell', 'dev sell carries real signature');

  // time passes with no trades, volume collapses
  now += 7 * 3_600_000;
  pairs[MINT] = pairFor(MINT, { price: 0.000008, mcap: 8000, h24: 300, h1: 0, m5: 0 });
  await w.refresh([MINT]);
  w.tick();
  console.log('7h later: status', t.status, 'score', t.deathScore, 'silent', t.hoursSilent.toFixed(1), '| ', t.lastAction.reason);
  w.tick();
  console.log('status', t.status, 'eligible', t.eligibility);
  now += 61_000;
  w.tick();
  console.log('takeover?', t.status, '|', t.lastAction.reason, '| paper', t.lastAction.paper, 'vault', w.agent.vaultSol.toFixed(3));
  console.assert(t.status === 'taken_over' && t.lastAction.paper === true && !t.lastAction.txSig, 'paper takeover without tx');

  // price dips 25% → paper dip buy; then 3x → paper sell
  pairs[MINT] = pairFor(MINT, { price: 0.000006, mcap: 6000, h24: 900, h1: 200 });
  await w.refresh([MINT]);
  w.tick();
  console.log('dip:', t.lastAction.kind, t.lastAction.reason);
  pairs[MINT] = pairFor(MINT, { price: 0.00003, mcap: 30000, h24: 90_000, h1: 9000 });
  await w.refresh([MINT]);
  w.tick();
  console.log('moon:', t.status, t.lastAction.kind, t.lastAction.reason, '| pnl', t.position.pnl.toFixed(3));
  console.assert(t.status === 'revived', 'revived at 3x');

  // persistence round-trip: a fresh world restored from this one's state sees the same coins and positions
  const st = JSON.parse(JSON.stringify(w.toState()));
  const w2 = new LiveWorld({ fetchFn: fakeFetch, socketFactory: factory, now: clock, manual: true, relaxHolders: true });
  w2.loadState(st);
  const t2 = w2.tokens.find((x) => x.ca === MINT)!;
  console.log('restored:', w2.tokens.length, 'tokens', w2.actions.length, 'actions', t2.status, 'pnl', t2.position.pnl.toFixed(3), 'vault', w2.agent.vaultSol.toFixed(3), '| last:', t2.lastAction.kind);
  console.assert(w2.tokens.length === w.tokens.length && t2.status === 'revived' && w2.agent.vaultSol === w.agent.vaultSol, 'restore round-trip');
  await new Promise((r) => setTimeout(r, 5));
  console.assert(sock.sent.some((x) => x.includes('subscribeTokenTrade') && x.includes(MINT)), 'restore resubscribes');
  w2.stop();

  const { snap } = w.snapshot();
  console.log('snapshot source:', snap.source.kind, snap.source.paper, snap.source.errors, '| tokens', snap.tokens.length, '| actions', snap.actions.length);
  console.log('fetch calls:', calls.length, '| posts:', Object.keys(snap.postsByCa).length);
  w.stop();
})();
