// TODO(phase-2) Scanner. Runs server-side.
//
// - Subscribe to PumpPortal's websocket (wss://pumpportal.fun/api/data):
//   subscribeNewToken, subscribeTokenTrade for tracked CAs.
// - Helius webhooks on each dev wallet (type: SWAP / TRANSFER) to observe dev
//   sells; each observation becomes a `flag` Action with the dev's tx sig.
// - Socials: poll the coin's X/TG links from pump.fun metadata; record the
//   last activity time -> hoursSilent.
// - Compute the death score with lib/score.ts (the same code the UI shows).

import type { Token } from '../types';

export interface ScannerEvents {
  onNewToken(t: Pick<Token, 'ca' | 'name' | 'ticker' | 'image' | 'devWallet'>): void;
  onDevSell(ca: string, pctOfHoldings: number, txSig: string, at: number): void;
  onTrade(ca: string, priceUsd: number, volUsd: number, at: number): void;
  onSocial(ca: string, at: number): void;
}

export interface Scanner {
  start(events: ScannerEvents): Promise<void>;
  track(ca: string): void;
  untrack(ca: string): void;
}

export const BUNDLE_CHECK = 'TODO: flag launches where >= 3 wallets funded by the dev bought in the first block';
export const HONEYPOT_CHECK = 'TODO: simulate a sell via Jupiter quote + simulateTransaction before any buy';
