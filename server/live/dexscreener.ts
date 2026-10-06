// DexScreener public API (no key). Rate limits: 60 rpm for profiles/boosts,
// 300 rpm for pairs/tokens. https://docs.dexscreener.com/api/reference

export interface DsProfile {
  chainId: string;
  tokenAddress: string;
  icon?: string;
  description?: string;
  links?: { type?: string; label?: string; url: string }[];
}

export interface DsPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceUsd?: string;
  txns?: Record<'m5' | 'h1' | 'h6' | 'h24', { buys: number; sells: number }>;
  volume?: Partial<Record<'m5' | 'h1' | 'h6' | 'h24', number>>;
  priceChange?: Partial<Record<'m5' | 'h1' | 'h6' | 'h24', number>>;
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string; websites?: { url: string }[]; socials?: { type: string; url: string }[] };
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

const BASE = 'https://api.dexscreener.com';

export class DexScreener {
  constructor(private fetchFn: Fetch = (u, i) => fetch(u, i)) {}

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetchFn(`${BASE}${path}`, { headers: { accept: 'application/json' }, cache: 'no-store' } as RequestInit);
    if (!res.ok) throw new Error(`dexscreener ${path} → ${res.status}`);
    return (await res.json()) as T;
  }

  latestProfiles = () => this.get<DsProfile[]>('/token-profiles/latest/v1');
  latestBoosts = () => this.get<DsProfile[]>('/token-boosts/latest/v1');
  topBoosts = () => this.get<DsProfile[]>('/token-boosts/top/v1');

  /** Up to 30 addresses per call. Returns every pair for each token. */
  tokens = (addresses: string[]) => this.get<DsPair[]>(`/tokens/v1/solana/${addresses.slice(0, 30).join(',')}`);

  search = async (q: string) => (await this.get<{ pairs: DsPair[] | null }>(`/latest/dex/search?q=${encodeURIComponent(q)}`)).pairs ?? [];
}

/** Pick the most liquid Solana pair for a token. */
export function bestPair(pairs: DsPair[], ca: string): DsPair | undefined {
  return pairs
    .filter((p) => p.chainId === 'solana' && p.baseToken.address === ca)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0) || (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))[0];
}
