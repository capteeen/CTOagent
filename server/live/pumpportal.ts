// PumpPortal public data websocket (no key): new pump.fun launches and
// per-token / per-account trades. https://pumpportal.fun/data-api/real-time

export interface PpNewToken {
  txType: 'create';
  signature: string;
  mint: string;
  traderPublicKey: string; // creator
  name: string;
  symbol: string;
  uri?: string;
  initialBuy?: number; // tokens
  solAmount?: number;
  marketCapSol?: number;
  pool?: string;
}

export interface PpTrade {
  txType: 'buy' | 'sell';
  signature: string;
  mint: string;
  traderPublicKey: string;
  tokenAmount: number;
  solAmount: number;
  newTokenBalance?: number;
  marketCapSol?: number;
  pool?: string;
}

export type PpMessage = PpNewToken | PpTrade;

export interface PpEvents {
  onNewToken(t: PpNewToken, at: number): void;
  onTrade(t: PpTrade, at: number): void;
  onStatus?(s: 'open' | 'closed' | 'error', detail?: string): void;
}

/** Minimal interface so tests can inject a fake socket. */
export interface SocketLike {
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export type SocketFactory = (url: string) => SocketLike;

const URL = 'wss://pumpportal.fun/api/data';

export class PumpPortal {
  private ws: SocketLike | null = null;
  private open = false;
  private tokenSubs = new Set<string>();
  private accountSubs = new Set<string>();
  private stopped = false;
  private backoff = 1000;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private events: PpEvents, private factory: SocketFactory = (u) => new WebSocket(u) as unknown as SocketLike, private now: () => number = () => Date.now()) {}

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.open = false;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }

  /**
   * Node's WebSocket throws on send before the connection is open (browsers
   * queue instead). Subscriptions are kept in tokenSubs/accountSubs and
   * replayed by onopen, so dropping a send while disconnected is safe.
   */
  private send(msg: unknown) {
    if (!this.ws || !this.open) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (e) {
      this.events.onStatus?.('error', String((e as Error).message ?? e));
    }
  }

  private connect() {
    let ws: SocketLike;
    try {
      ws = this.factory(URL);
    } catch (e) {
      this.events.onStatus?.('error', String(e));
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.open = true;
      this.backoff = 1000;
      this.events.onStatus?.('open');
      this.send({ method: 'subscribeNewToken' });
      if (this.tokenSubs.size) this.send({ method: 'subscribeTokenTrade', keys: [...this.tokenSubs] });
      if (this.accountSubs.size) this.send({ method: 'subscribeAccountTrade', keys: [...this.accountSubs] });
    };
    ws.onmessage = (ev) => {
      let m: PpMessage;
      try {
        m = JSON.parse(String(ev.data)) as PpMessage;
      } catch {
        return;
      }
      if (!m || typeof m !== 'object' || !('txType' in m)) return;
      const at = this.now();
      if (m.txType === 'create') this.events.onNewToken(m, at);
      else if (m.txType === 'buy' || m.txType === 'sell') this.events.onTrade(m, at);
    };
    ws.onerror = (e) => this.events.onStatus?.('error', (e as { message?: string })?.message ?? 'socket error');
    ws.onclose = () => {
      this.open = false;
      this.events.onStatus?.('closed');
      this.ws = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.connect(), this.backoff);
    this.backoff = Math.min(30_000, this.backoff * 2);
  }

  /** Follow trades on these mints (dev-sell detection, last trade time). */
  watchTokens(mints: string[]) {
    const add = mints.filter((m) => !this.tokenSubs.has(m));
    if (!add.length) return;
    add.forEach((m) => this.tokenSubs.add(m));
    this.send({ method: 'subscribeTokenTrade', keys: add });
  }

  unwatchTokens(mints: string[]) {
    const rm = mints.filter((m) => this.tokenSubs.has(m));
    if (!rm.length) return;
    rm.forEach((m) => this.tokenSubs.delete(m));
    this.send({ method: 'unsubscribeTokenTrade', keys: rm });
  }

  watchAccounts(wallets: string[]) {
    const add = wallets.filter((w) => !this.accountSubs.has(w));
    if (!add.length) return;
    add.forEach((w) => this.accountSubs.add(w));
    this.send({ method: 'subscribeAccountTrade', keys: add });
  }
}
