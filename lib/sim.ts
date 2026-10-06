// Phase 1 MOCK SIMULATOR.
//
// A self-contained world: ~200 seeded pump.fun-style coins across every status,
// an agent with a vault, and a lifecycle engine that walks coins through
// flag → takeover → dip buys → posts → revive / abandon. Every action carries a
// one-line reason built from the numbers actually in the row.
//
// The sim clock runs SIM_SPEED× faster than wall time so a 72h abandon window
// plays out in ~72 real minutes. All timestamps shown in the UI are sim time.
//
// Phase 2 replaces this file with a server feed (see lib/source.ts + README).

import { base58, chance, gauss, happens, hashStr, int, mulberry32, pick, uni, type Rng } from './rng';
import { checkEligibility, DEFAULT_RULES, scoreParts } from './score';
import { hhmm, short, SOL_USD, usd } from './format';
import { AGENT_WALLET } from './links';
import type { Action, ActionKind, Agent, Distribution, Evidence, Post, Snapshot, Stats, Status, Token } from './types';

export const SIM_SPEED = 60;
export const SEED = 0xc70;
export const SUPPLY = 1_000_000_000;
const H = 3_600_000;
const MIN = 60_000;

// ---------------------------------------------------------------------------
// identity

const PRE = ['Based', 'Sad', 'Tiny', 'Giga', 'Baby', 'Moon', 'Dark', 'Lil', 'Wet', 'Sleepy', 'Angry', 'Rich', 'Broke', 'Cursed', 'Holy', 'Turbo', 'Smol', 'Fat', 'Lazy', 'Wild', 'Retro', 'Cyber', 'Frozen', 'Silly', 'Golden', 'Pixel', 'Feral', 'Chill', 'Mega', 'Last'];
const NOUN = ['Frog', 'Cat', 'Dog', 'Hamster', 'Penguin', 'Goat', 'Otter', 'Duck', 'Whale', 'Monkey', 'Pepe', 'Capy', 'Bonk', 'Shiba', 'Toad', 'Crab', 'Moth', 'Raccoon', 'Possum', 'Snail', 'Bear', 'Bull', 'Llama', 'Koala', 'Gecko', 'Hippo', 'Seal', 'Worm', 'Owl', 'Fish'];
const SUFFIX = ['', '', '', ' Inu', ' Wif Hat', ' Coin', ' on Sol', ' 2.0', ' Classic', ' Army'];
const HUES = [212, 0, 145, 32, 270, 190, 330, 55, 100, 230];

export function coinImage(ticker: string, hue: number, face: number): string {
  const eyes = ['M22 26h4M38 26h4', 'M21 24a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M37 24a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', 'M20 27l6-3M38 24l6 3'][face % 3];
  const mouth = ['M24 40q8 6 16 0', 'M24 42h16', 'M24 44q8 -6 16 0'][(face >> 2) % 3];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="hsl(${hue} 70% 92%)"/><circle cx="32" cy="32" r="22" fill="hsl(${hue} 65% 55%)"/><path d="${eyes}" stroke="#0A0A0A" stroke-width="3" stroke-linecap="round" fill="#0A0A0A"/><path d="${mouth}" stroke="#0A0A0A" stroke-width="3" stroke-linecap="round" fill="none"/><text x="32" y="60" font-family="monospace" font-size="9" font-weight="700" text-anchor="middle" fill="hsl(${hue} 60% 30%)">${ticker.slice(0, 5)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const sig = (r: Rng) => base58(r, 88);
const postId = (r: Rng) => String(1_800_000_000_000_000_000 + Math.floor(r() * 99_999_999_999_999));

// ---------------------------------------------------------------------------
// hidden per-token state (never rendered, drives the sim)

interface Hidden {
  fate: 'revive' | 'fade';
  doomed: boolean;
  drift: number;
  volLvl: number;
  holdersAtTakeover: number;
  takeoverDueAt?: number;
  announceAt?: number;
  nextUpdateAt?: number;
  initialSol: number;
  feeAccrued: number;
  ineligibleLogged: boolean;
}

const QUESTIONS = ['is the dev back?', 'wen pump', 'is this a rug again?', 'who runs this account?', 'how do I know you won’t dump on us?', 'what’s the plan?', 'are you a bot?', 'can I trust this CTO?'];
const REPLIERS = ['degenmike', 'solsurfer', 'chartgoblin', 'moonmaxi', 'bagholder_99', 'jeetwatch', 'anon_capital', 'pumpenjoyer', 'trenchrat', 'rugsurvivor'];
const FLAVOR = ['Chart’s alive. Dev isn’t.', 'Still here. Every tx is linked.', 'Nobody’s coming to save it. So we did.', 'No promises, only receipts.', 'The community wallet is public. Check it.'];

// ---------------------------------------------------------------------------

export class World {
  r: Rng;
  now: number;
  sweep = 0;
  tokens: Token[] = [];
  idx = new Map<string, number>();
  hid = new Map<string, Hidden>();
  actions: Action[] = [];
  actionsByCa: Record<string, Action[]> = {};
  postsByCa: Record<string, Post[]> = {};
  distributions: Distribution[] = [];
  agent: Agent;
  stats: Stats;
  ctoHolders = 1_284;
  lastDistAt: number;
  private dirtyCa = new Set<string>();
  private snapActions: Record<string, Action[]> = {};
  private snapPosts: Record<string, Post[]> = {};
  private fresh: string[] = [];
  private tickerSet = new Set<string>();
  private seq = 0;

  constructor(seed: number, now: number) {
    this.r = mulberry32(seed);
    this.now = now;
    this.lastDistAt = now;
    this.agent = {
      wallet: AGENT_WALLET,
      vaultSol: 120,
      pnlTotal: 0,
      takeovers: 0,
      revived: 0,
      abandoned: 0,
      feesPaidToHolders: 0,
      rules: { ...DEFAULT_RULES },
      pendingToHolders: 0,
      feesClaimed: 0,
    };
    this.stats = { scanned: 182_406, takeovers: 0, volumeRevived: 0, paidToHolders: 0 };
  }

  // ------------------------------------------------------------- seeding

  static seed(seed = SEED, realNow = Date.now()): World {
    const w = new World(seed, realNow);
    const r = w.r;
    const plan: Status[] = [
      ...Array<Status>(70).fill('scanning'),
      ...Array<Status>(38).fill('dying'),
      ...Array<Status>(30).fill('dead'),
      ...Array<Status>(30).fill('taken_over'),
      ...Array<Status>(16).fill('revived'),
      ...Array<Status>(16).fill('abandoned'),
    ];

    // 1) takeover cohort: replay history through the real engine, in time order.
    const cohort: { t: Token; at: number }[] = [];
    for (const st of plan) {
      if (st !== 'taken_over' && st !== 'revived' && st !== 'abandoned') continue;
      const hoursAgo = st === 'abandoned' ? uni(r, 74, 110) : st === 'revived' ? uni(r, 18, 70) : uni(r, 0.5, 70);
      const at = realNow - hoursAgo * H;
      const t = w.newToken(at, 'dead', { eligible: true });
      const h = w.hid.get(t.ca)!;
      h.fate = st === 'revived' ? 'revive' : st === 'abandoned' ? 'fade' : chance(r, 0.3) ? 'revive' : 'fade';
      if (st === 'revived') h.drift = 1; // sentinel: strong revive
      w.seedDeathHistory(t, at);
      h.takeoverDueAt = at;
      cohort.push({ t, at });
    }
    const start = Math.min(...cohort.map((c) => c.at)) - 10 * MIN;
    w.lastDistAt = start;
    const active = new Set<string>();
    for (let tNow = start; tNow < realNow; tNow += 10 * MIN) {
      w.now = tNow;
      for (const c of cohort) {
        if (!active.has(c.t.ca) && c.at <= tNow) {
          active.add(c.t.ca);
          w.executeTakeover(c.t);
        }
      }
      w.stepAll(10 / 60, (t) => active.has(t.ca));
    }
    w.now = realNow;

    // 2) everything else is set directly at "now"
    for (const st of plan) {
      if (st === 'scanning' || st === 'dying' || st === 'dead') {
        const t = w.newToken(realNow, st, { eligible: st === 'dead' ? chance(r, 0.45) : undefined });
        if (st === 'dead') {
          w.seedDeathHistory(t, realNow - uni(r, 0.05, 6) * H);
          const h = w.hid.get(t.ca)!;
          if (t.eligibility?.ok) h.takeoverDueAt = realNow + uni(r, 1, 40) * MIN;
        } else if (st === 'dying') {
          w.act(t, 'flag', w.reasonDying(t), { at: realNow - uni(r, 0.1, 3) * H, tags: ['score', 'dev', 'social'], txSig: undefined });
        }
      }
    }

    w.actions.sort((a, b) => b.at - a.at);
    for (const ca in w.actionsByCa) w.actionsByCa[ca].sort((a, b) => b.at - a.at);
    for (const ca in w.postsByCa) w.postsByCa[ca].sort((a, b) => b.at - a.at);
    for (const t of w.tokens) t.lastAction = w.actionsByCa[t.ca][0];
    w.dirtyCa = new Set(w.tokens.map((t) => t.ca));
    w.fresh = [];
    return w;
  }

  /** Create a token whose metrics are consistent with `status` at time `at`. */
  newToken(at: number, status: Status, opts: { eligible?: boolean } = {}): Token {
    const r = this.r;
    let base = `${pick(r, PRE)} ${pick(r, NOUN)}`;
    let name = base + pick(r, SUFFIX);
    let ticker = base.split(' ').map((w, i) => (i === 0 ? w.slice(0, chance(r, 0.5) ? 1 : 3) : w.slice(0, 4))).join('').toUpperCase();
    while (this.tickerSet.has(ticker)) ticker = ticker.slice(0, 6) + int(r, 2, 9);
    this.tickerSet.add(ticker);
    const ca = base58(r, 40) + 'pump';
    const hue = pick(r, HUES) + int(r, -8, 8);

    const peakMcap = Math.exp(uni(r, Math.log(60_000), Math.log(1_400_000)));
    let holdersPeak = int(r, 260, 3200);
    const flags = { bundle: chance(r, 0.07), honeypot: chance(r, 0.03), creatorFeesClaimable: chance(r, 0.65) };

    let mcap = peakMcap, volFrac = 1, holdFrac = 1, devSold = 0, silent = 0;
    let peak = peakMcap;
    const live = (a: number, b: number) => uni(r, a, b);
    if (status === 'scanning') {
      mcap = peakMcap * live(0.35, 1); volFrac = live(0.35, 1); holdFrac = live(0.9, 1); devSold = chance(r, 0.4) ? 0 : live(2, 30); silent = live(0, 2.2);
    } else if (status === 'dying') {
      mcap = peakMcap * live(0.08, 0.35); volFrac = live(0.08, 0.35); holdFrac = live(0.72, 0.9); devSold = live(45, 85); silent = live(2.5, 5.5);
    } else {
      // dead (also the pre-takeover state of the cohort)
      mcap = opts.eligible ? live(6_000, 42_000) : chance(r, 0.35) ? live(2_000, 80_000) : live(5_500, 45_000);
      peak = Math.max(peakMcap, mcap * live(6, 40));
      volFrac = live(0.004, 0.03); holdFrac = live(0.42, 0.66); devSold = chance(r, 0.6) ? 100 : live(82, 99); silent = live(6.2, 26);
      if (opts.eligible) { flags.bundle = false; flags.honeypot = false; holdersPeak = Math.max(holdersPeak, 420); }
      else if (opts.eligible === false) {
        const why = r();
        if (why < 0.45) holdersPeak = int(r, 120, 230);
        else if (why < 0.7) flags.bundle = true;
        else if (why < 0.8) flags.honeypot = true;
        else mcap = chance(r, 0.5) ? live(1_500, 4_800) : live(52_000, 90_000);
      }
    }
    const volPeak = peak * live(1.4, 5);
    const price = mcap / SUPPLY;
    const launchedAt = at - (status === 'scanning' ? live(2, 40) : live(30, 90)) * H;

    const t: Token = {
      ca, name, ticker, image: coinImage(ticker, hue, int(r, 0, 11)), devWallet: base58(r, 44), status,
      deathScore: 0, devSoldPct: devSold, hoursSilent: silent,
      vol24h: volPeak * volFrac, volPeak, volSinceTakeover: 0,
      holders: Math.round(holdersPeak * holdFrac), holdersPeak, mcap,
      position: { sol: 0, avgPrice: 0, pnl: 0, tokens: 0, cost: 0, realized: 0 },
      feesEarned: 0, lastAction: undefined as unknown as Action,
      price, peakPrice: peak / SUPPLY, launchedAt, lastSocialAt: at - silent * H, dipBuys: 0, flags, eligibility: null,
    };
    this.recompute(t, at);
    // keep seeded scores inside their status band
    for (let i = 0; i < 30; i++) {
      const hi = status === 'scanning' ? 36 : status === 'dying' ? 66 : 101;
      const lo = status === 'dying' ? 42 : status === 'dead' ? 72 : -1;
      if (t.deathScore > hi) { t.devSoldPct *= 0.85; t.lastSocialAt += (at - t.lastSocialAt) * 0.25; }
      else if (t.deathScore < lo) { t.lastSocialAt -= 0.6 * H; t.devSoldPct = Math.min(100, t.devSoldPct + 4); }
      else break;
      this.recompute(t, at);
    }
    if (status === 'dead' || opts.eligible !== undefined) t.eligibility = checkEligibility(t, this.agent.rules);
    this.hid.set(ca, {
      fate: 'fade', doomed: status === 'scanning' && chance(r, 0.18), drift: uni(r, -0.03, 0.025), volLvl: uni(r, 0.35, 1),
      holdersAtTakeover: t.holders, initialSol: 0, feeAccrued: 0, ineligibleLogged: false,
    });
    this.idx.set(ca, this.tokens.length);
    this.tokens.push(t);
    this.actionsByCa[ca] = [];
    this.postsByCa[ca] = [];
    this.act(t, 'flag', `Scanner picked up $${ticker}: launched ${hhmm(launchedAt)}, peak mcap ${usd(peak)}, ${holdersPeak} holders at peak. Tracking.`, { at: launchedAt + uni(r, 5, 40) * MIN, tags: ['score'] });
    return t;
  }

  /** Past observations that explain how a coin got to "dead". */
  private seedDeathHistory(t: Token, deadAt: number) {
    const r = this.r;
    const sellAt = deadAt - uni(r, 3, 20) * H;
    this.act(t, 'flag', `Dev wallet ${short(t.devWallet)} sold ${t.devSoldPct.toFixed(0)}% of its bag at ${hhmm(sellAt)}. Price -${uni(r, 55, 85).toFixed(0)}% in 10m.`, { at: sellAt, txSig: sig(r), tags: ['dev', 'score'] });
    this.act(t, 'flag', this.reasonDead(t), { at: deadAt - uni(r, 1, 10) * MIN, tags: ['score', 'social', 'volume', 'holders'] });
    if (t.eligibility && !t.eligibility.ok) this.hid.get(t.ca)!.ineligibleLogged = true;
  }

  // ------------------------------------------------------------- engine

  /** Advance the world by `realMs` of wall time. */
  tick(realMs: number) {
    const dtMs = realMs * SIM_SPEED;
    this.now += dtMs;
    this.sweep++;
    const h = dtMs / H;
    this.stats.scanned += Math.round(h * 60 * uni(this.r, 14, 26));
    if (this.tokens.length < 420 && happens(this.r, 1.0, h)) {
      const t = this.newToken(this.now, 'scanning');
      this.hid.get(t.ca)!.doomed = chance(this.r, 0.5);
    }
    this.stepAll(h, () => true);
    if (happens(this.r, 0.6, h)) this.ctoHolders += int(this.r, 1, 6);
  }

  private stepAll(h: number, include: (t: Token) => boolean) {
    for (const t of this.tokens) if (include(t)) this.stepToken(t, h);
    if (this.now - this.lastDistAt >= 6 * H) this.distribute();
    this.engage(h);
  }

  private stepToken(t: Token, h: number) {
    const r = this.r;
    const hd = this.hid.get(t.ca)!;
    const rules = this.agent.rules;
    this.market(t, hd, h);

    // off-agent events: dev sells and organic socials
    if (t.status === 'scanning' || t.status === 'dying') {
      const devRate = t.status === 'dying' ? 0.3 : hd.doomed ? 0.25 : 0.02;
      if (t.devSoldPct < 99.5 && happens(r, devRate, h)) {
        const x = Math.min(100 - t.devSoldPct, uni(r, 8, 35));
        t.devSoldPct += x;
        t.price *= 1 - (x / 100) * uni(r, 0.3, 0.6);
        this.recompute(t, this.now);
        this.act(t, 'flag', `Dev wallet ${short(t.devWallet)} sold ${x.toFixed(0)}% more at ${hhmm(this.now)}. Dev total sold ${t.devSoldPct.toFixed(0)}%. Score ${t.deathScore}.`, { txSig: sig(r), tags: ['dev', 'score'] });
      }
      const socialRate = t.status === 'dying' ? 0.1 : hd.doomed ? 0.06 : 0.7;
      if (happens(r, socialRate, h)) t.lastSocialAt = this.now - uni(r, 0, h) * H;
    } else if (t.status === 'dead' || t.status === 'abandoned') {
      if (happens(r, 0.005, h)) t.lastSocialAt = this.now;
    }
    this.recompute(t, this.now);

    switch (t.status) {
      case 'scanning':
        if (t.deathScore >= 40) {
          t.status = 'dying';
          this.act(t, 'flag', this.reasonDying(t), { tags: ['score', 'dev', 'social', 'volume'] });
        }
        break;
      case 'dying':
        if (t.deathScore < 28) {
          t.status = 'scanning';
          this.act(t, 'flag', `Socials active ${((this.now - t.lastSocialAt) / MIN).toFixed(0)}m ago, vol back to ${usd(t.vol24h)}. Score ${t.deathScore}. Back to scan pool.`, { tags: ['score', 'social'] });
        } else if (t.deathScore >= rules.deathThreshold) {
          t.status = 'dead';
          t.eligibility = checkEligibility(t, rules);
          this.act(t, 'flag', this.reasonDead(t), { tags: ['score', 'social', 'volume', 'holders'] });
          if (t.eligibility.ok) hd.takeoverDueAt = this.now + uni(r, 2, 25) * MIN;
          else hd.ineligibleLogged = true;
        }
        break;
      case 'dead':
        if (hd.takeoverDueAt && this.now >= hd.takeoverDueAt) {
          hd.takeoverDueAt = undefined;
          t.eligibility = checkEligibility(t, rules);
          if (t.eligibility.ok) this.executeTakeover(t);
          else this.act(t, 'flag', `Pre-trade recheck failed: ${t.eligibility.reasons.join(', ')}. Not taking over.`, { tags: ['score', 'holders'] });
        } else if (!hd.takeoverDueAt && t.eligibility && !t.eligibility.ok && t.eligibility.reasons.every((x) => x.startsWith('mcap') && x.includes('>'))) {
          // only blocker is "mcap too high": keep re-checking as it bleeds out
          const el = checkEligibility(t, rules);
          if (el.ok) {
            t.eligibility = el;
            hd.takeoverDueAt = this.now + uni(r, 2, 15) * MIN;
            this.act(t, 'flag', `Mcap bled to ${usd(t.mcap)}, inside the $${rules.mcapMin / 1000}k-$${rules.mcapMax / 1000}k range. Score ${t.deathScore}. Queued for takeover.`, { tags: ['score'] });
          }
        }
        break;
      case 'taken_over':
      case 'revived':
        this.agentWork(t, hd, h);
        break;
    }
  }

  private market(t: Token, hd: Hidden, h: number) {
    const r = this.r;
    let mu = 0, sg = 0.08;
    const ratio = t.takeoverPrice ? t.price / t.takeoverPrice : 1;
    switch (t.status) {
      case 'scanning': mu = hd.drift; sg = 0.12; break;
      case 'dying': mu = -0.07; sg = 0.08; break;
      case 'dead': mu = t.mcap > this.agent.rules.mcapMax ? -0.04 : -0.006; sg = 0.05; break;
      case 'taken_over': mu = hd.fate === 'revive' ? (hd.drift === 1 ? 0.09 : 0.055) : -0.006; sg = hd.fate === 'revive' ? 0.13 : 0.09; break;
      case 'revived': mu = ratio > 4 ? -0.02 : 0.002; sg = 0.06; break;
      case 'abandoned': mu = -0.02; sg = 0.05; break;
    }
    t.price = Math.max(1e-7, t.price * Math.exp(mu * h + sg * Math.sqrt(h) * gauss(r)));
    t.mcap = t.price * SUPPLY;
    if (t.price > t.peakPrice) t.peakPrice = t.price;

    const v0 = t.volAtTakeover ?? t.vol24h;
    let vTarget = t.vol24h, hTarget = t.holders;
    switch (t.status) {
      case 'scanning': vTarget = t.volPeak * hd.volLvl * (hd.doomed ? 0.35 : 1); hTarget = t.holdersPeak * (hd.doomed ? 0.85 : 1.02); break;
      case 'dying': vTarget = t.volPeak * 0.06; hTarget = t.holdersPeak * 0.62; break;
      case 'dead': vTarget = t.volPeak * 0.012; hTarget = t.holdersPeak * 0.5; break;
      case 'taken_over': vTarget = v0 * (1 + 3.5 * Math.max(0, ratio - 1)) * (hd.fate === 'revive' ? 2.4 : 1.25); hTarget = hd.holdersAtTakeover * (1 + 0.35 * Math.max(0, ratio - 1) + (hd.fate === 'revive' ? 0.1 : -0.04)); break;
      case 'revived': vTarget = v0 * 2.6 * Math.pow(Math.min(Math.max(1, ratio), 5), 0.6); hTarget = hd.holdersAtTakeover * (1.25 + 0.2 * ratio); break;
      case 'abandoned': vTarget = v0 * 0.4; hTarget = hd.holdersAtTakeover * 0.8; break;
    }
    const a = 1 - Math.exp(-h / 2.5);
    t.vol24h = Math.max(40, t.vol24h + (vTarget * (1 + 0.2 * gauss(r)) - t.vol24h) * a);
    if (t.vol24h > t.volPeak) t.volPeak = t.vol24h;
    t.holders = Math.max(12, Math.round(t.holders + (hTarget - t.holders) * a * 0.6 + gauss(r) * Math.sqrt(h) * 2));
    if (t.holders > t.holdersPeak) t.holdersPeak = t.holders;
    if (t.takeoverAt) t.volSinceTakeover += (t.vol24h * h) / 24;
  }

  private recompute(t: Token, now: number) {
    t.hoursSilent = Math.max(0, (now - t.lastSocialAt) / H);
    t.deathScore = scoreParts(t).total;
    const p = t.position;
    p.sol = (p.tokens * t.price) / SOL_USD;
    p.pnl = p.realized + p.sol - p.cost;
    this.dirtyCa.add(t.ca);
  }

  executeTakeover(t: Token) {
    const r = this.r;
    const rules = this.agent.rules;
    const hd = this.hid.get(t.ca)!;
    const vault = this.agent.vaultSol;
    const size = Math.min(rules.maxInitialSol, (vault * rules.initialBuyPct) / 100);
    if (size < 0.05) {
      this.act(t, 'flag', `Eligible, but vault is ${vault.toFixed(2)} SOL; 2% is below the 0.05 SOL minimum. Skipping.`, { tags: ['position'] });
      return;
    }
    const parts = scoreParts(t);
    const lastDev = (this.actionsByCa[t.ca] ?? []).find((a) => a.tags.includes('dev'));
    t.status = 'taken_over';
    t.takeoverAt = this.now;
    t.takeoverPrice = t.price;
    t.volAtTakeover = t.vol24h;
    t.xHandle = `${t.ticker.slice(0, 12)}CTO`;
    hd.holdersAtTakeover = t.holders;
    hd.initialSol = size;
    hd.announceAt = this.now + uni(r, 8, 55) * 1000;
    hd.nextUpdateAt = this.now + rules.updateEveryHours * H;
    this.buy(t, size);
    this.agent.takeovers++;
    this.stats.takeovers++;
    this.act(
      t,
      'takeover',
      `Dev sold ${t.devSoldPct.toFixed(0)}%${lastDev ? ` at ${hhmm(lastDev.at)}` : ''}. Socials silent ${t.hoursSilent.toFixed(1)}h. Volume -${parts.volDropPct.toFixed(0)}%. Taking over: bought ${size.toFixed(3)} SOL at ${usd(t.mcap)} mcap (${rules.initialBuyPct}% of ${vault.toFixed(1)} SOL vault).`,
      { amount: size, txSig: sig(r), tags: ['position', 'score', 'volume'], price: t.price },
    );
  }

  private buy(t: Token, solIn: number) {
    const p = t.position;
    const qty = (solIn * SOL_USD) / t.price;
    p.avgPrice = (p.avgPrice * p.tokens + t.price * qty) / (p.tokens + qty);
    p.tokens += qty;
    p.cost += solIn;
    this.agent.vaultSol -= solIn;
    this.recompute(t, this.now);
  }

  /** Sell a fraction of the position. Returns [proceeds, realized]. */
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
    this.recompute(t, this.now);
    return [proceeds, realized];
  }

  private agentWork(t: Token, hd: Hidden, h: number) {
    const r = this.r;
    const rules = this.agent.rules;
    const tp = t.takeoverPrice!;
    const ratio = t.price / tp;
    const handle = t.xHandle!;

    if (hd.announceAt && this.now >= hd.announceAt) {
      const at = hd.announceAt;
      hd.announceAt = undefined;
      const secs = Math.round((at - t.takeoverAt!) / 1000);
      const parts = scoreParts(t);
      const post = this.post(t, 'announce', at,
        `$${t.ticker} has been taken over by CTO.\n\nDev sold ${t.devSoldPct.toFixed(0)}% and went quiet. Volume was down ${parts.volDropPct.toFixed(0)}% from peak.\n\nCTO bought ${hd.initialSol.toFixed(2)} SOL at ${usd(tp * SUPPLY)} mcap. Every move from here is on-chain and linked.\n\nCA: ${t.ca}`);
      this.act(t, 'post', `Takeover announcement live on @${handle}, ${secs}s after entry. New account, rules pinned.`, { at, postUrl: post.url, tags: ['social'] });
    }

    if (t.status === 'taken_over') {
      // dip buys: every -dipStep% (compounded) below takeover price
      const level = Math.pow(1 - rules.dipStepPct / 100, t.dipBuys + 1);
      if (t.dipBuys < rules.dipBuys && ratio <= level) {
        const size = Math.min(hd.initialSol * 0.5, this.agent.vaultSol * 0.02);
        if (size >= 0.02) {
          t.dipBuys++;
          this.buy(t, size);
          this.act(t, 'buy', `Price ${((ratio - 1) * 100).toFixed(0)}% from takeover entry. Dip buy ${t.dipBuys}/${rules.dipBuys}: ${size.toFixed(3)} SOL at ${usd(t.mcap)} mcap. Avg entry now ${usd(t.position.avgPrice * SUPPLY)}.`, { amount: size, txSig: sig(r), tags: ['position'], price: t.price });
        }
      }
      // exit: sell half at exitMultiple
      if (ratio >= rules.exitMultiple) {
        const [out, realized] = this.sell(t, rules.exitSellPct / 100);
        t.status = 'revived';
        this.agent.revived++;
        this.act(t, 'sell', `Price ${ratio.toFixed(2)}x from entry. Sold ${rules.exitSellPct}% (${out.toFixed(3)} SOL out, ${realized >= 0 ? '+' : ''}${realized.toFixed(3)} SOL realized). Holding the rest. Status → Revived.`, { amount: out, txSig: sig(r), tags: ['position', 'fees', 'volume'], price: t.price });
        return;
      }
      // abandon window
      if (this.now - t.takeoverAt! >= rules.abandonHours * H) {
        const volD = (t.vol24h / t.volAtTakeover! - 1) * 100;
        if (volD >= 200) {
          t.status = 'revived';
          this.agent.revived++;
          this.act(t, 'flag', `${rules.abandonHours}h check: volume ${volD.toFixed(0)}% vs takeover, holders ${t.holders}. Recovered. Status → Revived, holding position.`, { tags: ['volume', 'holders'] });
        } else {
          const qty = t.position.tokens;
          const [out, realized] = this.sell(t, 1);
          t.status = 'abandoned';
          this.agent.abandoned++;
          this.act(t, 'abandon', `${rules.abandonHours}h since takeover. Volume ${volD >= 0 ? '+' : ''}${volD.toFixed(0)}% vs entry (needed +200%). Sold ${fmtQty(qty)} ${t.ticker} for ${out.toFixed(3)} SOL, PnL ${t.position.realized >= 0 ? '+' : ''}${t.position.realized.toFixed(3)} SOL. Abandoned.`, { amount: out, txSig: sig(r), tags: ['position', 'volume'], price: t.price });
          void realized;
          return;
        }
      }
    }

    // scheduled updates
    if (hd.nextUpdateAt && this.now >= hd.nextUpdateAt) {
      const at = hd.nextUpdateAt;
      hd.nextUpdateAt += rules.updateEveryHours * H;
      const hrs = Math.round((at - t.takeoverAt!) / H);
      const mD = (ratio - 1) * 100, vD = (t.vol24h / t.volAtTakeover! - 1) * 100, hD = (t.holders / hd.holdersAtTakeover - 1) * 100;
      const sgn = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(0)}%`;
      const post = this.post(t, 'update', at,
        `$${t.ticker} · ${hrs}h since takeover\n\nMcap ${usd(t.mcap)} (${sgn(mD)} vs entry)\nVol 24h ${usd(t.vol24h)} (${sgn(vD)})\nHolders ${t.holders} (${sgn(hD)})\nAgent holds ${t.position.sol.toFixed(2)} SOL of $${t.ticker}\n\n${pick(r, FLAVOR)}`);
      this.act(t, 'post', `${rules.updateEveryHours}h update on @${handle}: mcap ${usd(t.mcap)} (${sgn(mD)}), vol ${usd(t.vol24h)} (${sgn(vD)}), ${t.holders} holders.`, { at, postUrl: post.url, tags: ['social', 'volume', 'holders'] });
    }

    // replies to mentions
    if (happens(r, t.status === 'revived' ? 0.25 : 0.15, h)) {
      const who = pick(r, REPLIERS);
      const q = pick(r, QUESTIONS);
      const answer = q.includes('dev')
        ? `Dev is gone. Their wallet sold ${t.devSoldPct.toFixed(0)}%. This account is the CTO agent, every trade is linked in the bio.`
        : q.includes('dump') || q.includes('trust')
          ? `Rules are public: sell ${rules.exitSellPct}% only at ${rules.exitMultiple}x from entry (${usd(tp * SUPPLY * rules.exitMultiple)} mcap). Position right now: ${t.position.sol.toFixed(2)} SOL.`
          : q.includes('bot')
            ? `Yes. An agent with its own wallet. Trades follow fixed rules; posts are written from on-chain data.`
            : `Mcap ${usd(t.mcap)}, ${t.holders} holders, vol 24h ${usd(t.vol24h)}. Next update in ${Math.max(0, ((hd.nextUpdateAt ?? this.now) - this.now) / MIN).toFixed(0)}m.`;
      const post = this.post(t, 'reply', this.now, `@${who} ${answer}`, `@${who}: ${q}`);
      this.act(t, 'reply', `Replied to @${who} ("${q}") with live numbers: mcap ${usd(t.mcap)}, ${t.holders} holders.`, { postUrl: post.url, tags: ['social'] });
    }

    // creator fees
    if (t.flags.creatorFeesClaimable) {
      hd.feeAccrued += (t.vol24h * h) / 24 * 0.001 / SOL_USD;
      if (hd.feeAccrued >= 0.04 && happens(r, 0.5, h)) {
        const amt = hd.feeAccrued;
        hd.feeAccrued = 0;
        const toH = (amt * rules.holderSharePct) / 100;
        t.feesEarned += amt;
        this.agent.feesClaimed += amt;
        this.agent.pendingToHolders += toH;
        this.agent.vaultSol += amt - toH;
        this.dirtyCa.add(t.ca);
        this.act(t, 'claim', `Claimed ${amt.toFixed(3)} SOL creator fees (vol 24h ${usd(t.vol24h)}). ${rules.holderSharePct}% → holders pool (${toH.toFixed(3)}), ${100 - rules.holderSharePct}% → vault (${(amt - toH).toFixed(3)}).`, { amount: amt, txSig: sig(r), tags: ['fees'] });
      }
    }
  }

  private distribute() {
    this.lastDistAt = this.now;
    const amt = this.agent.pendingToHolders;
    if (amt < 0.01) return;
    this.agent.pendingToHolders = 0;
    this.agent.feesPaidToHolders += amt;
    this.stats.paidToHolders += amt;
    this.distributions.unshift({ id: `d${this.distributions.length + 1}`, at: this.now, sol: amt, recipients: this.ctoHolders, perMillion: amt / (SUPPLY / 1e6), txSig: sig(this.r) });
  }

  private engage(h: number) {
    const r = this.r;
    for (const t of this.tokens) {
      if (!t.xHandle) continue;
      const posts = this.postsByCa[t.ca];
      const boost = t.status === 'revived' ? 3 : t.status === 'taken_over' ? 1 : 0.15;
      let touched = false;
      for (let i = 0; i < Math.min(4, posts.length); i++) {
        const p = posts[i];
        const age = (this.now - p.at) / H;
        if (age > 8) break;
        const k = boost * h * 30 * Math.exp(-age / 2) * (p.kind === 'reply' ? 0.2 : 1);
        if (k <= 0.05) continue;
        const add = (x: number) => Math.max(0, Math.round(x * k * uni(r, 0.4, 1.6)));
        posts[i] = { ...p, likes: p.likes + add(1), reposts: p.reposts + add(0.25), replies: p.replies + add(0.12), views: p.views + add(40) };
        touched = true;
      }
      if (touched) this.dirtyCa.add(t.ca);
    }
  }

  // ------------------------------------------------------------- emit

  private act(t: Token, kind: ActionKind, reason: string, o: { at?: number; amount?: number; txSig?: string; postUrl?: string; tags: Evidence[]; price?: number }) {
    const a: Action = {
      id: `a${++this.seq}`, ca: t.ca, ticker: t.ticker, kind, reason, at: o.at ?? this.now,
      amount: o.amount, txSig: o.txSig ?? (kind === 'flag' || o.postUrl ? undefined : sig(this.r)), postUrl: o.postUrl, tags: o.tags, price: o.price,
    };
    this.actions.unshift(a);
    if (this.actions.length > 4000) this.actions.length = 4000;
    const list = this.actionsByCa[t.ca] ?? (this.actionsByCa[t.ca] = []);
    list.unshift(a);
    if (list.length > 400) list.length = 400;
    if (!t.lastAction || a.at >= t.lastAction.at) t.lastAction = a;
    this.dirtyCa.add(t.ca);
    this.fresh.push(a.id);
    return a;
  }

  private post(t: Token, kind: Post['kind'], at: number, text: string, inReplyTo?: string): Post {
    const id = postId(this.r);
    const p: Post = { id, ca: t.ca, handle: t.xHandle!, kind, text, inReplyTo, url: `https://x.com/${t.xHandle}/status/${id}`, at, likes: 0, reposts: 0, replies: 0, views: 0 };
    t.lastSocialAt = Math.max(t.lastSocialAt, at);
    const list = this.postsByCa[t.ca];
    list.unshift(p);
    if (list.length > 200) list.length = 200;
    this.recompute(t, this.now);
    return p;
  }

  // ------------------------------------------------------------- reasons

  private reasonDying(t: Token) {
    const p = scoreParts(t);
    return `Score ${t.deathScore}: dev sold ${t.devSoldPct.toFixed(0)}%, socials silent ${t.hoursSilent.toFixed(1)}h, vol -${p.volDropPct.toFixed(0)}% from peak. Watching.`;
  }

  private reasonDead(t: Token) {
    const p = scoreParts(t);
    const head = `Score ${t.deathScore}. Dev sold ${t.devSoldPct.toFixed(0)}%. Socials silent ${t.hoursSilent.toFixed(1)}h. Volume -${p.volDropPct.toFixed(0)}%. Holders ${t.holders} (-${p.holdersDropPct.toFixed(0)}%).`;
    const el = t.eligibility ?? checkEligibility(t, this.agent.rules);
    return el.ok ? `${head} Eligible at ${usd(t.mcap)} mcap. Queued for takeover.` : `${head} Dead, but ${el.reasons.join('; ')}. Not touching it.`;
  }

  // ------------------------------------------------------------- output

  snapshot(): { snap: Snapshot; fresh: string[] } {
    for (const ca of this.dirtyCa) {
      this.snapActions[ca] = (this.actionsByCa[ca] ?? []).slice();
      this.snapPosts[ca] = (this.postsByCa[ca] ?? []).slice();
    }
    this.dirtyCa.clear();
    let pnl = 0, volRev = 0;
    for (const t of this.tokens) {
      pnl += t.position.pnl;
      if (t.status === 'taken_over' || t.status === 'revived') volRev += t.volSinceTakeover;
    }
    this.agent.pnlTotal = pnl;
    this.stats.volumeRevived = volRev;
    const fresh = this.fresh;
    this.fresh = [];
    return {
      fresh,
      snap: {
        source: { kind: 'sim', paper: true, notes: ['Mock simulator. Coins, trades and posts are generated.'], updatedAt: Date.now(), errors: [] },
        now: this.now,
        sweep: this.sweep,
        tokens: this.tokens.map((t) => ({ ...t, position: { ...t.position } })),
        actions: this.actions.slice(0, 1500),
        actionsByCa: { ...this.snapActions },
        postsByCa: { ...this.snapPosts },
        agent: { ...this.agent },
        stats: { ...this.stats },
        distributions: this.distributions.slice(),
        ctoHolders: this.ctoHolders,
      },
    };
  }
}

function fmtQty(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return n.toFixed(0);
}

/** Deterministic seeded world, also used server-side for OG images. */
export function seedWorld(now = Date.now()) {
  return World.seed(SEED, now);
}

export { hashStr };
