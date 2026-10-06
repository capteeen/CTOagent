// Core data model. Fields marked "spec" are from the product brief; the rest
// are extras the simulator (and later the Phase 2 backend) needs to stay
// honest about where every number came from.

export type Status = 'scanning' | 'dying' | 'dead' | 'taken_over' | 'revived' | 'abandoned';

export type ActionKind = 'flag' | 'takeover' | 'buy' | 'sell' | 'post' | 'reply' | 'abandon' | 'claim';

/** Which row metrics an action is evidence for. Drives "click a number → see its actions". */
export type Evidence = 'score' | 'dev' | 'social' | 'volume' | 'position' | 'fees' | 'holders';

export interface Action {
  id: string;
  ca: string;
  kind: ActionKind;
  /** SOL amount for buys/sells/claims. */
  amount?: number;
  /** One line of plain English from the agent. Always references real numbers. */
  reason: string;
  txSig?: string;
  postUrl?: string;
  at: number;
  /** extras */
  ticker: string;
  tags: Evidence[];
  /** USD price per token at execution, for trades. */
  price?: number;
}

export interface Position {
  /** Mark-to-market value of the held tokens, in SOL. */
  sol: number;
  /** USD price per token paid on average. */
  avgPrice: number;
  /** Realized + unrealized PnL, in SOL. */
  pnl: number;
  /** extras */
  tokens: number;
  cost: number;
  realized: number;
}

export interface Token {
  ca: string;
  name: string;
  ticker: string;
  image: string;
  devWallet: string;
  status: Status;
  deathScore: number;
  devSoldPct: number;
  hoursSilent: number;
  vol24h: number;
  volPeak: number;
  volSinceTakeover: number;
  holders: number;
  holdersPeak: number;
  mcap: number;
  takeoverAt?: number;
  takeoverPrice?: number;
  xHandle?: string;
  position: Position;
  feesEarned: number;
  lastAction: Action;

  // ---- extras ----
  price: number;
  peakPrice: number;
  launchedAt: number;
  lastSocialAt: number;
  volAtTakeover?: number;
  dipBuys: number;
  flags: { bundle: boolean; honeypot: boolean; creatorFeesClaimable: boolean };
  /** Result of the last eligibility check, null if never dead. */
  eligibility: Eligibility | null;
}

export interface Eligibility {
  ok: boolean;
  reasons: string[];
}

export interface Post {
  id: string;
  ca: string;
  handle: string;
  kind: 'announce' | 'update' | 'reply';
  text: string;
  inReplyTo?: string;
  url: string;
  at: number;
  likes: number;
  reposts: number;
  replies: number;
  views: number;
}

export interface Rules {
  deathThreshold: number;
  mcapMin: number;
  mcapMax: number;
  minHolders: number;
  initialBuyPct: number;
  maxInitialSol: number;
  dipBuys: number;
  exitMultiple: number;
  abandonHours: number;
  // extras, also public
  dipStepPct: number;
  exitSellPct: number;
  updateEveryHours: number;
  holderSharePct: number;
}

export interface Agent {
  wallet: string;
  vaultSol: number;
  pnlTotal: number;
  takeovers: number;
  revived: number;
  abandoned: number;
  feesPaidToHolders: number;
  rules: Rules;
  /** extras */
  pendingToHolders: number;
  feesClaimed: number;
}

export interface Stats {
  scanned: number;
  takeovers: number;
  volumeRevived: number;
  paidToHolders: number;
}

export interface Distribution {
  id: string;
  at: number;
  sol: number;
  recipients: number;
  perMillion: number; // SOL per 1M CTO held
  txSig: string;
}

export interface Snapshot {
  now: number;
  sweep: number;
  tokens: Token[];
  actions: Action[];
  actionsByCa: Record<string, Action[]>;
  postsByCa: Record<string, Post[]>;
  agent: Agent;
  stats: Stats;
  distributions: Distribution[];
  ctoHolders: number;
}
