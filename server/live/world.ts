// LIVE WORLD. Real Solana tokens, real market data, PAPER agent.
//
// Data in:
//   - DexScreener: discovery (latest profiles / boosts), price, mcap, volume,
//     txn counts, images. Polled.
//   - PumpPortal websocket: new pump.fun launches (gives the creator wallet),
//     trades on tracked mints (dev sells with real signatures, last trade time).
//   - Helius (optional, HELIUS_API_KEY): holder counts.
//
// What is NOT real yet: the agent's trades. Without a funded keypair it runs
// the same rules on paper. Those actions carry `paper: true`, no tx sig, and
// the UI labels them. No X posts are generated.
//
// Signals that differ from the sim, stated in Snapshot.source.notes:
//   - "hours silent" = hours since the last on-chain trade (no social data).
//   - holders unknown without Helius → holder signal is 0 and the ≥150 holder
//     rule can't be checked (blocks takeovers unless LIVE_RELAX_HOLDERS=1).

import { checkEligibility, DEFAULT_RULES, scoreParts } from '@/lib/score';
import { hhmm, short, SOL_USD, usd } from '@/lib/format';
import { AGENT_WALLET } from '@/lib/links';
import { coinImage } from '@/lib/sim';
import { hashStr } from '@/lib/rng';
import type { Action, ActionKind, Agent, Evidence, Snapshot, Stats, Token } from '@/lib/types';
import { bestPair, DexScreener, type DsPair, type DsProfile } from './dexscreener';
import { Helius } from './helius';
import { PumpPortal, type PpNewToken, type PpTrade, type SocketFactory } from './pumpportal';

const H = 3_600_000;
const MIN = 60_000;
export const SUPPLY = 1_000_000_000; // pump.fun standard supply; used for avg-entry mcap display

interface Hidden {
  devBought: number;
  devSold: number;
  lastTradeAt: number;
  takeoverDueAt?: number;
  holdersAt: number;
  initialSol: number;
  seenPairs: boolean;
  source: 'dexscreener' | 'pumpportal' | 'watchlist';
  lastHoldersAt: number;
  firstSeen: number;
}

export interface LiveOptions {
  fetchFn?: typeof fetch;
  socketFactory?: SocketFactory;
  heliusKey?: string;
  watchlist?: string[];
  paperVaultSol?: number;
  relaxHolders?: boolean;
  maxTokens?: number;
  now?: () => number;
  /** disable timers (tests drive the world manually) */
  manual?: boolean;
}

export class LiveWorld {
  tokens: Token[] = [];
  private byCa = new Map<string, Token>();
  private hid = new Map<string, Hidden>();
  actions: Action[] = [];
  actionsByCa: Record<string, Action[]> = {};
  agent: Agent;
  stats: Stats = { scanned: 0, takeovers: 0, volumeRevived: 0, paidToHolders: 0 };
  errors = new Map<string, string>();
  private seq = 0;
  private fresh: string[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];
  private ds: DexScreener;
  private pp: PumpPortal;
  private helius: Helius | null;
  private now: () => number;
  private opts: Required<Pick<LiveOptions, 'paperVaultSol' | 'relaxHolders' | 'maxTokens'>>;
  private watchlist: string[];
  started = false;
  updatedAt = 0;
  ppStatus: 'open' | 'closed' | 'error' = 'closed';

  constructor(o: LiveOptions = {}) {
    this.now = o.now ?? (() => Date.now());
    this.opts = { paperVaultSol: o.paperVaultSol ?? 10, relaxHolders: o.relaxHolders ?? false, maxTokens: o.maxTokens ?? 300 };
    this.watchlist = o.watchlist ?? [];
    this.ds = new DexScreener(o.fetchFn);
    this.helius = o.heliusKey ? new Helius(o.heliusKey, o.fetchFn) : null;
    this.pp = new PumpPortal(
      {
        onNewToken: (t, at) => this.onNewToken(t, at),
        onTrade: (t, at) => this.onTrade(t, at),
        onStatus: (s, d) => {
          this.ppStatus = s;
          if (s === 'error') this.errors.set('pumpportal', d ?? 'socket error');
          if (s === 'open') this.errors.delete('pumpportal');
        },
      },
      o.socketFactory,
      this.now,
    );
    this.agent = {
      wallet: AGENT_WALLET,
      vaultSol: this.opts.paperVaultSol,
      pnlTotal: 0,
      takeovers: 0,
      revived: 0,
      abandoned: 0,
      feesPaidToHolders: 0,
      rules: { ...DEFAULT_RULES },
      pendingToHolders: 0,
      feesClaimed: 0,
    };
    if (!o.manual) this.start();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.pp.start();
    void this.discover();
    this.timers.push(setInterval(() => void this.discover(), 90_000));
    this.timers.push(setInterval(() => void this.refresh(), 20_000));
    this.timers.push(setInterval(() => this.tick(), 5_000));
    if (this.helius) this.timers.push(setInterval(() => void this.refreshHolders(), 120_000));
  }

  stop() {
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.pp.stop();
    this.started = false;
  }

  // ---------------------------------------------------------------- discovery

  async discover() {
    const found = new Map<string, DsProfile | null>();
    for (const ca of this.watchlist) found.set(ca, null);
    const pulls: [string, () => Promise<DsProfile[]>][] = [
      ['profiles', this.ds.latestProfiles],
      ['boosts', this.ds.latestBoosts],
      ['topBoosts', this.ds.topBoosts],
    ];
    for (const [name, fn] of pulls) {
      try {
        for (const p of await fn()) if (p.chainId === 'solana' && p.tokenAddress) found.set(p.tokenAddress, p);
        this.errors.delete(`dexscreener:${name}`);
      } catch (e) {
        this.errors.set(`dexscreener:${name}`, String((e as Error).message ?? e));
      }
    }
    const fresh = [...found.entries()].filter(([ca]) => !this.byCa.has(ca));
    this.stats.scanned += found.size;
    for (const [ca, p] of fresh) {
      // one bad token must not abort the whole discovery pass
      try {
        this.addToken(ca, {
          name: '',
          ticker: '',
          image: p?.icon ?? '',
          devWallet: '',
          source: this.watchlist.includes(ca) ? 'watchlist' : 'dexscreener',
        });
      } catch (e) {
        this.errors.set('world:addToken', String((e as Error).message ?? e));
      }
    }
    if (fresh.length) await this.refresh(fresh.map(([ca]) => ca));
    this.evict();
  }

  private addToken(ca: string, init: { name: string; ticker: string; image: string; devWallet: string; source: Hidden['source']; devBought?: number }) {
    if (this.byCa.has(ca)) return this.byCa.get(ca)!;
    const now = this.now();
    const t: Token = {
      ca,
      name: init.name || short(ca, 4),
      ticker: init.ticker || ca.slice(0, 4).toUpperCase(),
      image: init.image || coinImage(init.ticker || ca.slice(0, 4).toUpperCase(), hashStr(ca) % 360, hashStr(ca) % 12),
      devWallet: init.devWallet,
      status: 'scanning',
      deathScore: 0,
      devSoldPct: 0,
      hoursSilent: 0,
      vol24h: 0,
      volPeak: 0,
      volSinceTakeover: 0,
      holders: 0,
      holdersPeak: 0,
      mcap: 0,
      position: { sol: 0, avgPrice: 0, pnl: 0, tokens: 0, cost: 0, realized: 0 },
      feesEarned: 0,
      lastAction: undefined as unknown as Action,
      price: 0,
      peakPrice: 0,
      launchedAt: now,
      lastSocialAt: now,
      dipBuys: 0,
      flags: { bundle: false, honeypot: false, creatorFeesClaimable: false },
      eligibility: null,
    };
    this.tokens.push(t);
    this.byCa.set(ca, t);
    this.hid.set(ca, { devBought: init.devBought ?? 0, devSold: 0, lastTradeAt: now, holdersAt: 0, initialSol: 0, seenPairs: false, source: init.source, lastHoldersAt: 0, firstSeen: now });
    this.actionsByCa[ca] = [];
    const via = init.source === 'pumpportal' ? 'pump.fun launch feed' : init.source === 'watchlist' ? 'watchlist' : 'DexScreener';
    this.act(t, 'flag', `Scanner picked up $${t.ticker} via ${via}${init.devWallet ? `. Dev wallet ${short(init.devWallet)}` : ''}. Tracking.`, { tags: ['score'], txSig: undefined });
    this.pp.watchTokens([ca]);
    if (init.devWallet) this.pp.watchAccounts([init.devWallet]);
    return t;
  }

  /** Keep the tracked set bounded: drop quiet scanning tokens first. */
  private evict() {
    const max = this.opts.maxTokens;
    if (this.tokens.length <= max) return;
    const now = this.now();
    const victims = this.tokens
      .filter((t) => t.status === 'scanning' && !this.watchlist.includes(t.ca) && now - this.hid.get(t.ca)!.firstSeen > 30 * MIN)
      .sort((a, b) => a.vol24h - b.vol24h)
      .slice(0, this.tokens.length - max);
    for (const t of victims) {
      this.byCa.delete(t.ca);
      this.hid.delete(t.ca);
      delete this.actionsByCa[t.ca];
    }
    const gone = new Set(victims.map((t) => t.ca));
    this.tokens = this.tokens.filter((t) => !gone.has(t.ca));
    this.actions = this.actions.filter((a) => !gone.has(a.ca));
    this.pp.unwatchTokens([...gone]);
  }

  // ---------------------------------------------------------------- pumpportal

  private onNewToken(m: PpNewToken, at: number) {
    this.stats.scanned++;
    if (this.byCa.has(m.mint)) return;
    // keep room: only take launches while under the cap
    if (this.tokens.length >= this.opts.maxTokens) return;
    const t = this.addToken(m.mint, { name: m.name, ticker: m.symbol, image: '', devWallet: m.traderPublicKey, source: 'pumpportal', devBought: m.initialBuy ?? 0 });
    t.launchedAt = at;
    const hd = this.hid.get(m.mint)!;
    hd.lastTradeAt = at;
    if (m.marketCapSol) {
      t.mcap = m.marketCapSol * SOL_USD;
      t.price = t.mcap / SUPPLY;
      t.peakPrice = t.price;
    }
    if (m.initialBuy && m.solAmount) {
      this.act(t, 'flag', `Dev ${short(m.traderPublicKey)} launched $${t.ticker} and bought ${(m.initialBuy / 1e6).toFixed(1)}M tokens for ${m.solAmount.toFixed(2)} SOL.`, { at, txSig: m.signature, tags: ['dev'] });
    }
  }

  private onTrade(m: PpTrade, at: number) {
    const t = this.byCa.get(m.mint);
    if (!t) return;
    const hd = this.hid.get(m.mint)!;
    hd.lastTradeAt = Math.max(hd.lastTradeAt, at);
    if (m.marketCapSol) {
      t.mcap = m.marketCapSol * SOL_USD;
      t.price = t.mcap / SUPPLY;
      if (t.price > t.peakPrice) t.peakPrice = t.price;
    }
    if (t.devWallet && m.traderPublicKey === t.devWallet) {
      if (m.txType === 'buy') hd.devBought += m.tokenAmount;
      else {
        hd.devSold += m.tokenAmount;
        const before = t.devSoldPct;
        this.recompute(t);
        this.act(t, 'flag', `Dev wallet ${short(t.devWallet)} sold ${(m.tokenAmount / 1e6).toFixed(1)}M $${t.ticker} for ${m.solAmount.toFixed(2)} SOL at ${hhmm(at)}. Dev total sold ${t.devSoldPct.toFixed(0)}% (was ${before.toFixed(0)}%). Score ${t.deathScore}.`, { at, txSig: m.signature, tags: ['dev', 'score'] });
      }
    }
    this.recompute(t);
  }

  // ---------------------------------------------------------------- dexscreener refresh

  async refresh(only?: string[]) {
    const cas = only ?? this.tokens.map((t) => t.ca);
    for (let i = 0; i < cas.length; i += 30) {
      const batch = cas.slice(i, i + 30);
      let pairs: DsPair[];
      try {
        pairs = await this.ds.tokens(batch);
        this.errors.delete('dexscreener:tokens');
      } catch (e) {
        this.errors.set('dexscreener:tokens', String((e as Error).message ?? e));
        continue;
      }
      for (const ca of batch) {
        const t = this.byCa.get(ca);
        if (!t) continue;
        const p = bestPair(pairs, ca);
        if (p) this.applyPair(t, p);
      }
      if (i + 30 < cas.length) await new Promise((r) => setTimeout(r, 250));
    }
    this.updatedAt = this.now();
  }

  private applyPair(t: Token, p: DsPair) {
    const hd = this.hid.get(t.ca)!;
    const now = this.now();
    if (!hd.seenPairs) {
      hd.seenPairs = true;
      if (p.baseToken.name) t.name = p.baseToken.name;
      if (p.baseToken.symbol) t.ticker = p.baseToken.symbol.replace(/^\$/, '').slice(0, 12);
      if (p.pairCreatedAt) t.launchedAt = Math.min(t.launchedAt, p.pairCreatedAt);
      if (hd.lastTradeAt === hd.firstSeen) hd.lastTradeAt = t.launchedAt;
    }
    if (p.info?.imageUrl) t.image = p.info.imageUrl;
    const price = parseFloat(p.priceUsd ?? '0');
    if (price > 0) {
      t.price = price;
      if (price > t.peakPrice) t.peakPrice = price;
    }
    const mcap = p.marketCap ?? p.fdv ?? (price > 0 ? price * SUPPLY : 0);
    if (mcap > 0) t.mcap = mcap;
    const v = p.volume ?? {};
    t.vol24h = v.h24 ?? t.vol24h;
    // peak = best 24h pace we have seen (24h window, or recent windows annualised to 24h)
    t.volPeak = Math.max(t.volPeak, v.h24 ?? 0, (v.h6 ?? 0) * 4, (v.h1 ?? 0) * 24);
    const tx = p.txns;
    if (tx) {
      const sum = (k: 'm5' | 'h1' | 'h6' | 'h24') => (tx[k]?.buys ?? 0) + (tx[k]?.sells ?? 0);
      // coarse last-trade estimate from the txn windows; exact trades from pumpportal override
      const est = sum('m5') > 0 ? now - 2 * MIN : sum('h1') > 0 ? now - 30 * MIN : sum('h6') > 0 ? now - 3 * H : sum('h24') > 0 ? now - 12 * H : t.launchedAt;
      hd.lastTradeAt = Math.max(hd.lastTradeAt, est);
    }
    this.recompute(t);
  }

  async refreshHolders() {
    if (!this.helius) return;
    const now = this.now();
    const due = this.tokens
      .filter((t) => (t.deathScore >= 35 || t.takeoverAt) && now - this.hid.get(t.ca)!.lastHoldersAt > 10 * MIN)
      .slice(0, 20);
    for (const t of due) {
      try {
        const n = await this.helius.holderCount(t.ca);
        t.holders = n;
        t.holdersPeak = Math.max(t.holdersPeak, n);
        this.hid.get(t.ca)!.lastHoldersAt = now;
        this.errors.delete('helius');
        this.recompute(t);
      } catch (e) {
        this.errors.set('helius', String((e as Error).message ?? e));
        break;
      }
    }
  }

  // ---------------------------------------------------------------- scoring + paper agent

  private recompute(t: Token) {
    const hd = this.hid.get(t.ca)!;
    const now = this.now();
    t.hoursSilent = Math.max(0, (now - hd.lastTradeAt) / H);
    t.devSoldPct = hd.devBought > 0 ? Math.min(100, (hd.devSold / hd.devBought) * 100) : 0;
    t.deathScore = scoreParts(t).total;
    const p = t.position;
    p.sol = (p.tokens * t.price) / SOL_USD;
    p.pnl = p.realized + p.sol - p.cost;
    if (t.takeoverAt) t.volSinceTakeover = Math.max(t.volSinceTakeover, t.vol24h * Math.min(1, (now - t.takeoverAt) / (24 * H)));
  }

  private eligibility(t: Token) {
    const el = checkEligibility(t, this.agent.rules);
    if (t.holdersPeak === 0) {
      el.reasons = el.reasons.filter((r) => !r.startsWith('holders'));
      if (!this.opts.relaxHolders) el.reasons.push('holders unknown (set HELIUS_API_KEY)');
    }
    if (!t.devWallet) el.reasons.push('dev wallet unknown (not a pump.fun launch seen live)');
    el.ok = el.reasons.length === 0;
    return el;
  }

  tick() {
    const now = this.now();
    const rules = this.agent.rules;
    for (const t of this.tokens) {
      const hd = this.hid.get(t.ca)!;
      this.recompute(t);
      if (t.mcap <= 0) continue;
      const parts = scoreParts(t);
      switch (t.status) {
        case 'scanning':
          if (t.deathScore >= 40) {
            t.status = 'dying';
            this.act(t, 'flag', `Score ${t.deathScore}: dev sold ${t.devSoldPct.toFixed(0)}%, no trades for ${t.hoursSilent.toFixed(1)}h, vol -${parts.volDropPct.toFixed(0)}% from peak pace. Watching.`, { tags: ['score', 'dev', 'social', 'volume'] });
          }
          break;
        case 'dying':
          if (t.deathScore < 28) {
            t.status = 'scanning';
            this.act(t, 'flag', `Trades resumed (${t.hoursSilent.toFixed(1)}h quiet), vol ${usd(t.vol24h)}. Score ${t.deathScore}. Back to scan pool.`, { tags: ['score', 'social'] });
          } else if (t.deathScore >= rules.deathThreshold) {
            t.status = 'dead';
            t.eligibility = this.eligibility(t);
            const head = `Score ${t.deathScore}. Dev sold ${t.devSoldPct.toFixed(0)}%. No trades ${t.hoursSilent.toFixed(1)}h. Volume -${parts.volDropPct.toFixed(0)}%.${t.holdersPeak ? ` Holders ${t.holders}.` : ''}`;
            this.act(t, 'flag', t.eligibility.ok ? `${head} Eligible at ${usd(t.mcap)} mcap. Paper takeover queued.` : `${head} Dead, but ${t.eligibility.reasons.join('; ')}. Not touching it.`, { tags: ['score', 'social', 'volume', 'holders'] });
            if (t.eligibility.ok) hd.takeoverDueAt = now + MIN;
          }
          break;
        case 'dead':
          if (hd.takeoverDueAt && now >= hd.takeoverDueAt) {
            hd.takeoverDueAt = undefined;
            t.eligibility = this.eligibility(t);
            if (t.eligibility.ok) this.paperTakeover(t);
            else this.act(t, 'flag', `Pre-trade recheck failed: ${t.eligibility.reasons.join(', ')}. Not taking over.`, { tags: ['score'] });
          } else if (!hd.takeoverDueAt && t.eligibility && !t.eligibility.ok) {
            const el = this.eligibility(t);
            if (el.ok) {
              t.eligibility = el;
              hd.takeoverDueAt = now + MIN;
              this.act(t, 'flag', `Now eligible: mcap ${usd(t.mcap)}, score ${t.deathScore}. Paper takeover queued.`, { tags: ['score'] });
            }
          }
          break;
        case 'taken_over':
          this.paperWork(t, hd);
          break;
      }
    }
    let pnl = 0, volRev = 0;
    for (const t of this.tokens) {
      pnl += t.position.pnl;
      if (t.status === 'taken_over' || t.status === 'revived') volRev += t.volSinceTakeover;
    }
    this.agent.pnlTotal = pnl;
    this.stats.volumeRevived = volRev;
  }

  private paperTakeover(t: Token) {
    const rules = this.agent.rules;
    const hd = this.hid.get(t.ca)!;
    const vault = this.agent.vaultSol;
    const size = Math.min(rules.maxInitialSol, (vault * rules.initialBuyPct) / 100);
    if (size < 0.05) {
      this.act(t, 'flag', `Eligible, but paper vault is ${vault.toFixed(2)} SOL; 2% is below the 0.05 SOL minimum. Skipping.`, { tags: ['position'] });
      return;
    }
    const parts = scoreParts(t);
    t.status = 'taken_over';
    t.takeoverAt = this.now();
    t.takeoverPrice = t.price;
    t.volAtTakeover = t.vol24h;
    hd.holdersAt = t.holders;
    hd.initialSol = size;
    this.buy(t, size);
    this.agent.takeovers++;
    this.stats.takeovers++;
    this.act(t, 'takeover', `Dev sold ${t.devSoldPct.toFixed(0)}%. No trades ${t.hoursSilent.toFixed(1)}h. Volume -${parts.volDropPct.toFixed(0)}%. PAPER takeover: ${size.toFixed(3)} SOL at ${usd(t.mcap)} mcap (${rules.initialBuyPct}% of ${vault.toFixed(1)} SOL). No X account: X API keys not configured.`, { amount: size, tags: ['position', 'score', 'volume'], price: t.price, paper: true });
  }

  private buy(t: Token, solIn: number) {
    const p = t.position;
    const qty = (solIn * SOL_USD) / t.price;
    p.avgPrice = (p.avgPrice * p.tokens + t.price * qty) / (p.tokens + qty);
    p.tokens += qty;
    p.cost += solIn;
    this.agent.vaultSol -= solIn;
    this.recompute(t);
  }

  private sell(t: Token, frac: number): [number, number] {
    const p = t.position;
    const qty = p.tokens * frac;
    const proceeds = (qty * t.price) / SOL_USD;
    const costOut = p.cost * frac;
    const realized = proceeds - costOut;
    p.tokens -= qty;
    p.cost -= costOut;
    p.realized += realized;
    this.agent.vaultSol += proceeds;
    if (realized > 0) {
      const toHolders = (realized * this.agent.rules.holderSharePct) / 100;
      this.agent.vaultSol -= toHolders;
      this.agent.pendingToHolders += toHolders;
    }
    this.recompute(t);
    return [proceeds, realized];
  }

  private paperWork(t: Token, hd: Hidden) {
    const rules = this.agent.rules;
    const now = this.now();
    const tp = t.takeoverPrice!;
    if (tp <= 0 || t.price <= 0) return;
    const ratio = t.price / tp;
    const level = Math.pow(1 - rules.dipStepPct / 100, t.dipBuys + 1);
    if (t.dipBuys < rules.dipBuys && ratio <= level) {
      const size = Math.min(hd.initialSol * 0.5, this.agent.vaultSol * 0.02);
      if (size >= 0.02) {
        t.dipBuys++;
        this.buy(t, size);
        this.act(t, 'buy', `Price ${((ratio - 1) * 100).toFixed(0)}% from takeover entry. PAPER dip buy ${t.dipBuys}/${rules.dipBuys}: ${size.toFixed(3)} SOL at ${usd(t.mcap)} mcap. Avg entry ${usd(t.position.avgPrice * SUPPLY)}.`, { amount: size, tags: ['position'], price: t.price, paper: true });
      }
    }
    if (ratio >= rules.exitMultiple) {
      const [out, realized] = this.sell(t, rules.exitSellPct / 100);
      t.status = 'revived';
      this.agent.revived++;
      this.act(t, 'sell', `Price ${ratio.toFixed(2)}x from entry. PAPER sell ${rules.exitSellPct}% (${out.toFixed(3)} SOL out, ${realized >= 0 ? '+' : ''}${realized.toFixed(3)} SOL realized). Holding the rest. Status → Revived.`, { amount: out, tags: ['position', 'fees', 'volume'], price: t.price, paper: true });
      return;
    }
    if (now - t.takeoverAt! >= rules.abandonHours * H) {
      const volD = t.volAtTakeover ? (t.vol24h / t.volAtTakeover - 1) * 100 : 0;
      if (volD >= 200) {
        t.status = 'revived';
        this.agent.revived++;
        this.act(t, 'flag', `${rules.abandonHours}h check: volume ${volD.toFixed(0)}% vs takeover. Recovered. Status → Revived, holding paper position.`, { tags: ['volume'] });
      } else {
        const [out] = this.sell(t, 1);
        t.status = 'abandoned';
        this.agent.abandoned++;
        this.act(t, 'abandon', `${rules.abandonHours}h since takeover. Volume ${volD >= 0 ? '+' : ''}${volD.toFixed(0)}% vs entry (needed +200%). PAPER sold all for ${out.toFixed(3)} SOL, PnL ${t.position.realized >= 0 ? '+' : ''}${t.position.realized.toFixed(3)} SOL. Abandoned.`, { amount: out, tags: ['position', 'volume'], price: t.price, paper: true });
      }
    }
  }

  // ---------------------------------------------------------------- emit

  private act(t: Token, kind: ActionKind, reason: string, o: { at?: number; amount?: number; txSig?: string; tags: Evidence[]; price?: number; paper?: boolean }) {
    const a: Action = { id: `l${++this.seq}`, ca: t.ca, ticker: t.ticker, kind, reason, at: o.at ?? this.now(), amount: o.amount, txSig: o.txSig, tags: o.tags, price: o.price, paper: o.paper };
    this.actions.unshift(a);
    if (this.actions.length > 3000) this.actions.length = 3000;
    const list = this.actionsByCa[t.ca] ?? (this.actionsByCa[t.ca] = []);
    list.unshift(a);
    if (list.length > 300) list.length = 300;
    if (!t.lastAction || a.at >= t.lastAction.at) t.lastAction = a;
    this.fresh.push(a.id);
    return a;
  }

  snapshot(): { snap: Snapshot; fresh: string[] } {
    const fresh = this.fresh;
    this.fresh = [];
    const notes = [
      'Live data: DexScreener (price, mcap, volume) + pump.fun launch/trade feed (dev wallets, dev sells).',
      'Agent trades are PAPER until a funded keypair is configured. No X posts are made.',
      '"Silent" = hours since the last on-chain trade (no social data source yet).',
      this.helius ? 'Holder counts via Helius.' : 'Holder counts unavailable (set HELIUS_API_KEY). Holder signal counts 0.',
    ];
    const actionsByCa: Record<string, Action[]> = {};
    for (const ca in this.actionsByCa) actionsByCa[ca] = this.actionsByCa[ca];
    return {
      fresh,
      snap: {
        source: { kind: 'live', paper: true, notes, updatedAt: this.updatedAt, errors: [...this.errors.entries()].map(([k, v]) => `${k}: ${v}`) },
        now: this.now(),
        sweep: Math.floor(this.now() / 5000),
        tokens: this.tokens.map((t) => ({ ...t, position: { ...t.position } })),
        actions: this.actions.slice(0, 1500),
        actionsByCa,
        postsByCa: {},
        agent: { ...this.agent },
        stats: { ...this.stats },
        distributions: [],
        ctoHolders: 0,
      },
    };
  }
}
