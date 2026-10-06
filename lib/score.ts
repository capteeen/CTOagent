import type { Eligibility, Rules, Token } from './types';

// Death score. Public rule, shown on /how and in every row's evidence drawer.
// Each signal earns linear partial credit and caps at its full weight once
// the threshold is reached.
export const SCORE_WEIGHTS = {
  dev: { pts: 35, threshold: 80, label: 'Dev wallet sold ≥80%' },
  social: { pts: 25, threshold: 6, label: 'No X/TG activity 6h+' },
  volume: { pts: 25, threshold: 90, label: 'Volume down ≥90% from peak' },
  holders: { pts: 15, threshold: 30, label: 'Holders down ≥30% from peak' },
} as const;

export const DEFAULT_RULES: Rules = {
  deathThreshold: 70,
  mcapMin: 5_000,
  mcapMax: 50_000,
  minHolders: 150,
  initialBuyPct: 2,
  maxInitialSol: 1,
  dipBuys: 3,
  exitMultiple: 3,
  abandonHours: 72,
  dipStepPct: 20,
  exitSellPct: 50,
  updateEveryHours: 2,
  holderSharePct: 70,
};

export interface ScoreParts {
  dev: number;
  social: number;
  volume: number;
  holders: number;
  volDropPct: number;
  holdersDropPct: number;
  total: number;
}

type ScoreInput = Pick<Token, 'devSoldPct' | 'hoursSilent' | 'vol24h' | 'volPeak' | 'holders' | 'holdersPeak'>;

export function scoreParts(t: ScoreInput): ScoreParts {
  const W = SCORE_WEIGHTS;
  const volDropPct = t.volPeak > 0 ? Math.max(0, (1 - t.vol24h / t.volPeak) * 100) : 0;
  const holdersDropPct = t.holdersPeak > 0 ? Math.max(0, (1 - t.holders / t.holdersPeak) * 100) : 0;
  const part = (v: number, w: { pts: number; threshold: number }) => Math.min(1, v / w.threshold) * w.pts;
  const dev = part(t.devSoldPct, W.dev);
  const social = part(t.hoursSilent, W.social);
  const volume = part(volDropPct, W.volume);
  const holders = part(holdersDropPct, W.holders);
  return { dev, social, volume, holders, volDropPct, holdersDropPct, total: Math.round(dev + social + volume + holders) };
}

export const deathScore = (t: ScoreInput) => scoreParts(t).total;

export function checkEligibility(t: Token, rules: Rules): Eligibility {
  const reasons: string[] = [];
  if (t.deathScore < rules.deathThreshold) reasons.push(`score ${t.deathScore} < ${rules.deathThreshold}`);
  if (t.mcap < rules.mcapMin) reasons.push(`mcap $${(t.mcap / 1000).toFixed(1)}k < $${rules.mcapMin / 1000}k`);
  if (t.mcap > rules.mcapMax) reasons.push(`mcap $${(t.mcap / 1000).toFixed(1)}k > $${rules.mcapMax / 1000}k`);
  if (t.holders < rules.minHolders) reasons.push(`holders ${t.holders} < ${rules.minHolders}`);
  if (t.flags.bundle) reasons.push('dev-bundle flags on launch');
  if (t.flags.honeypot) reasons.push('honeypot: sell sim reverted');
  return { ok: reasons.length === 0, reasons };
}
