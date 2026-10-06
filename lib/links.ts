// Every agent action links somewhere verifiable. In Phase 1 the signatures are
// simulated, so the explorer will 404; the UI marks them with a SIM badge.

export const IS_SIM = process.env.NEXT_PUBLIC_DATA_SOURCE !== 'live';

export const CTO_CA = 'CTo7xAgentDeadCoinsRevived1111111111pump';
export const AGENT_WALLET = 'CTOvau1tKx9rAgent7Hq2s5Lw3NnDe8YpRz4Fb6Mc';

export const txUrl = (sig: string) => `https://solscan.io/tx/${sig}`;
export const accountUrl = (addr: string) => `https://solscan.io/account/${addr}`;
export const tokenUrl = (ca: string) => `https://solscan.io/token/${ca}`;
export const pumpUrl = (ca: string) => `https://pump.fun/coin/${ca}`;
export const xUrl = (handle: string) => `https://x.com/${handle.replace(/^@/, '')}`;
