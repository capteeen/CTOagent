// Optional: holder counts via Helius DAS. Set HELIUS_API_KEY to enable.
// Without it, holders are unknown and the holder signal/eligibility is skipped
// (see LiveWorld notes).

import type { Fetch } from './dexscreener';

export class Helius {
  constructor(private key: string, private fetchFn: Fetch = (u, i) => fetch(u, i)) {}

  /** Counts token accounts with a non-zero balance. Pages 1000 at a time; capped. */
  async holderCount(mint: string, maxPages = 5): Promise<number> {
    let page = 1;
    let total = 0;
    for (; page <= maxPages; page++) {
      const res = await this.fetchFn(`https://mainnet.helius-rpc.com/?api-key=${this.key}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 'h', method: 'getTokenAccounts', params: { mint, page, limit: 1000, displayOptions: { showZeroBalance: false } } }),
      });
      if (!res.ok) throw new Error(`helius ${res.status}`);
      const j = (await res.json()) as { result?: { token_accounts?: unknown[] } };
      const n = j.result?.token_accounts?.length ?? 0;
      total += n;
      if (n < 1000) break;
    }
    return total;
  }
}
