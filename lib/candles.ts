// Reconstructs a plausible candle history for a token from its known anchor
// points (launch, peak, dev dump, takeover, agent trades, now) with a seeded
// Brownian bridge between them. Phase 2: replace with real OHLCV from the
// indexer.

import { gauss, hashStr, mulberry32 } from './rng';
import type { Action, Token } from './types';

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

const H = 3_600_000;

export function candleInterval(t: Token, now: number): number {
  const span = now - t.launchedAt;
  return span > 150 * H ? 30 * 60_000 : 15 * 60_000;
}

export function buildCandles(t: Token, actions: Action[], now: number): Candle[] {
  const r = mulberry32(hashStr(t.ca));
  const step = candleInterval(t, now);
  const start = Math.floor(t.launchedAt / step) * step;
  const end = Math.floor(now / step) * step;

  // anchors (time, price)
  const anchors: [number, number][] = [[start, t.peakPrice * 0.03]];
  const devDump = [...actions].reverse().find((a) => a.tags.includes('dev') && a.kind === 'flag');
  const firstDeath = devDump?.at ?? (t.takeoverAt ?? now) - 12 * H;
  const peakAt = Math.max(start + step * 2, Math.min(firstDeath - 2 * H, start + (firstDeath - start) * 0.45));
  if (t.status !== 'scanning') {
    anchors.push([peakAt, t.peakPrice]);
    if (devDump && devDump.at > peakAt) anchors.push([devDump.at, t.peakPrice * 0.25]);
  } else {
    anchors.push([start + (now - start) * 0.5, t.peakPrice * 0.9]);
  }
  for (const a of [...actions].reverse()) if (a.price && a.at > start) anchors.push([a.at, a.price]);
  anchors.push([now, t.price]);
  anchors.sort((a, b) => a[0] - b[0]);

  const closeAt = (ts: number): number => {
    let i = 0;
    while (i < anchors.length - 2 && anchors[i + 1][0] < ts) i++;
    const [t0, p0] = anchors[i];
    const [t1, p1] = anchors[i + 1];
    const f = t1 === t0 ? 1 : Math.min(1, Math.max(0, (ts - t0) / (t1 - t0)));
    return Math.exp(Math.log(p0) + (Math.log(p1) - Math.log(p0)) * f);
  };

  // Brownian bridge noise that is pinned to zero at each anchor
  const out: Candle[] = [];
  let noise = 0;
  let prevClose = closeAt(start);
  let ai = 1;
  for (let ts = start; ts <= end; ts += step) {
    while (ai < anchors.length && anchors[ai][0] <= ts) {
      ai++;
      noise *= 0.2;
    }
    const nextAnchor = anchors[Math.min(ai, anchors.length - 1)][0];
    const left = Math.max(1, (nextAnchor - ts) / step);
    noise = noise * (1 - 1 / left) + gauss(r) * 0.045;
    const close = closeAt(ts + step) * Math.exp(noise);
    const open = prevClose;
    const wick = 0.012 + Math.abs(gauss(r)) * 0.02;
    out.push({
      time: Math.floor(ts / 1000),
      open,
      close,
      high: Math.max(open, close) * (1 + wick),
      low: Math.min(open, close) * (1 - wick * 0.8),
    });
    prevClose = close;
  }
  if (out.length) {
    const last = out[out.length - 1];
    last.close = t.price;
    last.high = Math.max(last.high, t.price);
    last.low = Math.min(last.low, t.price);
  }
  return out;
}
