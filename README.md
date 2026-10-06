# CTO — the agent that takes over dead coins

Devs rug or abandon coins every hour. CTO is an AI agent that steps in as the
community takeover: it detects a dead coin, buys the dip with its own Solana
wallet, spins up a new X account, posts updates, and keeps the chart alive. It
earns a cut of the volume it revives. Every action is on-chain and explained in
one line.

This repo is **Phase 1**: the full UI running on an in-browser mock simulator.
No backend, no keys, no chain writes.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npx tsx scripts/sim-check.ts   # headless sanity run of the simulator
```

Node 18.18+ (tested on 22). `.npmrc` sets `legacy-peer-deps` so the Solana
wallet adapter does not drag in React Native.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Hero, the 4-step loop, live stats strip, live takeover feed |
| `/tokens` | The main page. TanStack Table, virtualized, sticky header, tabs (All / Watching / Taken over / Revived / Abandoned), sort on any column, search by CA/ticker/name. Row order freezes while your pointer is over the table so rows don't jump. Every number opens an evidence drawer with the formula and the actions behind it. Collapses to stacked cards on mobile. |
| `/token/[ca]` | Header (CA, status, dev wallet, CTO X account), metrics, lightweight-charts candles (log scale) with the takeover marked by a vertical blue line and trade markers, then Timeline / Takeover wallet / Posts. Has a per-coin OG image at `/token/[ca]/opengraph-image`. |
| `/agent` | Wallet, total SOL, PnL, win rate, payouts, scanner rules and strategy parameters as plain text, wallet activity |
| `/holders` | CTO CA, holders, distribution history, your claimable share, Claim (mocked). Wallet adapter (Phantom, Solflare, Backpack via Wallet Standard) is loaded on this route only. |
| `/how` | Death detection, takeover rules, fee flow, what the agent will never do |
| `/activity` | Full-page feed with kind filters and text search |

## Layout of the code

```
app/                  Next.js 14 app router pages
components/           UI (TokensTable, TokenChart, ActionFeed, EvidenceDrawer, …)
lib/types.ts          Data model (Token, Action, Agent, Rules, Stats, Post, Distribution, Snapshot)
lib/score.ts          Death score + eligibility. Shared by the sim, the UI and (later) the server.
lib/sim.ts            Phase 1 mock simulator (the World engine)
lib/source.ts         DataSource interface: SimSource (now) / LiveSource (Phase 2)
lib/store.ts          Zustand store fed by the DataSource
lib/candles.ts        Candle reconstruction for the chart (sim only)
lib/serverWorld.ts    Server-side seeded world for metadata + OG images
lib/phase2/           Typed stubs for scanner, trader, X, LLM, fees
```

## The simulator

`lib/sim.ts` seeds 200 coins deterministically (seed `0xC70`), so the server
and browser agree on CAs (needed for OG images and shareable links):

- 70 scanning, 38 dying, 30 dead (some eligible and queued, some rejected for
  holders, mcap, bundle or honeypot), and a takeover cohort of 30 taken over,
  16 revived, 16 abandoned.
- The takeover cohort is not faked: those coins are replayed through the real
  engine in time order from their takeover moment, so their buys, dip buys,
  posts, claims, sells and abandons all follow the rules and line up with
  the vault balance.
- Every 2-5 seconds the world ticks: prices and volumes move, devs sell, socials
  go quiet, scores cross thresholds, and the agent acts (flag, takeover, buy,
  post, reply, claim, sell, abandon). Each action gets a one-line reason built
  from the row's real numbers and a tx or post link.
- The sim clock runs at **60×** (shown in the header), so the 2h post cadence
  is 2 real minutes and the 72h abandon window is 72 real minutes.
- Tx signatures are random base58 and marked `SIM`; they will not resolve on
  Solscan.

### Death score

Weighted, with linear partial credit up to each threshold:

| Signal | Points |
| --- | --- |
| Dev wallet sold ≥80% | 35 |
| No X/TG activity 6h+ | 25 |
| Volume down ≥90% from peak | 25 |
| Holders down ≥30% from peak | 15 |

Eligible = score ≥70, mcap $5k-$50k, ≥150 holders, no bundle flags, passes a
sell simulation.

### Takeover rules

Initial buy 2% of vault (max 1 SOL) · dip buy on every further -20% from the
takeover price, up to 3 · sell 50% at 3x, hold the rest (→ Revived) · after 72h,
if 24h volume isn't +200% vs takeover, sell everything (→ Abandoned) ·
announcement within 60s, update every 2h, reply to mentions · revenue (creator
fees + realized PnL) split 70% to CTO holders, 30% to vault, distributed every 6h.

All of these live in `DEFAULT_RULES` in `lib/score.ts`; `/agent` and `/how`
render from the same object.

## Swapping the simulator for Phase 2

The UI only ever reads `Snapshot`s from a `DataSource` (`lib/source.ts`):

```ts
interface DataSource {
  kind: 'sim' | 'live';
  speed: number;                       // 1 for live
  start(listener: (snap: Snapshot, freshIds: string[]) => void): () => void;
}
```

1. **Build the backend** (a separate service; nothing secret goes into this
   Next app). Implement the interfaces in `lib/phase2/`:
   - `scanner.ts`: PumpPortal websocket for new tokens and trades; Helius
     webhooks on each dev wallet for sells (each becomes a `flag` Action with
     the dev's tx sig); socials polling for `hoursSilent`. Compute the death
     score with `lib/score.ts`, the same code the UI explains.
   - `trader.ts`: agent keypair held server-side only. pump.fun bonding curve
     buys/sells, Jupiter or pump-amm after graduation. Decisions are purely
     the `Rules`; every fill returns a signature → `Action.txSig`.
   - `x.ts`: one X account per takeover named `<TICKER>CTO`; post URLs →
     `Action.postUrl`.
   - `llm.ts`: writes posts and reasons from the row's numbers. **Never** used
     for trade decisions.
   - `fees.ts`: claim pump.fun creator fees where claimable, split per
     `holderSharePct`, pay holders with SPL/SOL transfers, record a
     `Distribution` per epoch.
2. **Expose a feed**: an SSE endpoint that emits `event: snapshot` with
   `{ snap, fresh }` (same shape as `World.snapshot()`), or diffs if you prefer
   and reassemble them in `LiveSource`.
3. **Flip the switch**: set `NEXT_PUBLIC_DATA_SOURCE=live` and
   `NEXT_PUBLIC_FEED_URL=https://…/feed`. `createSource()` returns
   `LiveSource`; the header shows LIVE and SIM badges disappear from links.
4. **Server pages**: replace `lib/serverWorld.ts` (used by `generateMetadata`
   and OG images) with a database read.
5. **Holders**: replace the mock balance and Claim in `app/holders/page.tsx`
   with an SPL token account read and a real claim transaction signed through
   the wallet adapter (`useWallet().sendTransaction`). Set `NEXT_PUBLIC_RPC_URL`.
6. **Charts**: replace `lib/candles.ts` with real OHLCV from your indexer.

## Environment

| Var | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_DATA_SOURCE` | `sim` | `live` switches to `LiveSource` |
| `NEXT_PUBLIC_FEED_URL` | `/api/feed` | SSE feed for `LiveSource` |
| `NEXT_PUBLIC_RPC_URL` | mainnet-beta | Wallet adapter connection |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Absolute URLs for OG images |

---

CTO trades on Solana with its own wallet. A meme, not an investment. Crypto is
risky. Only use what you can afford to lose.
