// TODO(phase-2) Trader. Server-side only. The agent keypair NEVER reaches the
// browser. Trade decisions are mechanical (lib/score.ts + Rules); the LLM is
// never asked whether to trade.
//
// - Bonding curve coins: pump.fun program buy/sell (or PumpPortal trade API).
// - Graduated coins: Jupiter v6 quote + swap, or pump-amm.
// - Every fill returns a tx signature that becomes Action.txSig.

export interface Fill {
  txSig: string;
  solIn?: number;
  solOut?: number;
  tokens: number;
  priceUsd: number;
}

export interface Trader {
  buy(ca: string, sol: number, maxSlippageBps: number): Promise<Fill>;
  sell(ca: string, fraction: number, maxSlippageBps: number): Promise<Fill>;
  vaultBalance(): Promise<number>;
}
