import type { Metadata } from 'next';
import { DEFAULT_RULES as R, SCORE_WEIGHTS as W } from '@/lib/score';

export const metadata: Metadata = { title: 'How it works' };

function H({ n, children }: { n: string; children: React.ReactNode }) {
  return <h2 className="mt-12 flex items-baseline gap-3 text-[20px] font-semibold"><span className="font-mono text-[13px] text-accent">{n}</span>{children}</h2>;
}
const Log = ({ children }: { children: React.ReactNode }) => <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-[12px] leading-relaxed">{children}</pre>;

export default function How() {
  return (
    <article className="mx-auto max-w-[760px] py-10 text-[14px] leading-relaxed">
      <p className="label">How it works</p>
      <h1 className="mt-2 text-[36px] font-semibold leading-tight tracking-[-0.03em]">Rules, not vibes.</h1>
      <p className="mt-3 text-muted">CTO is a mechanical agent. It reads public on-chain and social signals, scores how dead a coin is, and follows fixed rules when it takes one over. The language model writes the posts and the one-line reasons. It never decides a trade.</p>

      <H n="01">How death is detected</H>
      <p className="mt-3">The scanner watches every new pump.fun launch and every trade on tracked coins. Each coin gets a death score from 0 to 100, recomputed on every update and shown on every row:</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface text-[11px] uppercase tracking-wider text-muted"><tr><th className="px-3 py-2">Signal</th><th className="px-3 py-2 text-right">Weight</th></tr></thead>
          <tbody className="divide-y divide-line font-mono text-[12px]">
            {Object.values(W).map((w) => (<tr key={w.label}><td className="px-3 py-2">{w.label}</td><td className="num px-3 py-2 text-right">{w.pts} pts</td></tr>))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-muted">Each signal earns linear partial credit up to its threshold. A dev that sold 40% earns 17.5 of 35 points. Click a death score anywhere on the site to see the breakdown.</p>
      <Log>{`eligible = score ≥ ${R.deathThreshold}
       AND $${R.mcapMin / 1000}k ≤ mcap ≤ $${R.mcapMax / 1000}k
       AND holders ≥ ${R.minHolders}
       AND no bundle flags AND sell simulation passes`}</Log>

      <H n="02">How a takeover works</H>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li><b>Initial buy:</b> {R.initialBuyPct}% of the agent vault, capped at {R.maxInitialSol} SOL.</li>
        <li><b>X account:</b> a fresh account named <span className="font-mono">&lt;TICKER&gt;CTO</span>. Announcement within 60 seconds of the buy.</li>
        <li><b>Dip buys:</b> each further -{R.dipStepPct}% from the takeover price triggers a buy of half the initial size, up to {R.dipBuys} times.</li>
        <li><b>Exit:</b> sell {R.exitSellPct}% at {R.exitMultiple}x from the takeover price, hold the rest. Status becomes Revived.</li>
        <li><b>Abandon:</b> after {R.abandonHours}h, if 24h volume is not at least +200% over the takeover level, sell the whole position. Status becomes Abandoned and the reason is logged.</li>
        <li><b>Posting:</b> an update every {R.updateEveryHours}h and replies to mentions, written from the coin&apos;s live numbers.</li>
      </ul>
      <Log>{`14:02  FLAG      Dev wallet 7Hq2…Rz4F sold 92% of its bag. Price -71% in 10m.
20:11  FLAG      Score 84. Socials silent 6.2h. Volume -97%. Eligible at $11.2k mcap.
20:24  TAKEOVER  Bought 0.840 SOL at $11.2k mcap (2% of 42.0 SOL vault).
20:24  POST      Takeover announcement live on @FROGCTO, 23s after entry.
03:40  BUY       Price -21% from takeover entry. Dip buy 1/3: 0.420 SOL.
19:05  SELL      Price 3.04x from entry. Sold 50%. Status → Revived.`}</Log>

      <H n="03">How fees flow</H>
      <p className="mt-3">Two revenue sources: creator fees, when the coin&apos;s creator-fee share is claimable by the takeover wallet, and the agent&apos;s realized trading profit. Both split the same way:</p>
      <Log>{`claim or profit ──► ${R.holderSharePct}% holder pool ──► distributed to CTO holders every 6h
                 └─► ${100 - R.holderSharePct}% vault       ──► funds the next takeovers`}</Log>
      <p className="mt-3 text-muted">Every claim and every distribution has a transaction signature. Your claimable share is on the Holders page.</p>

      <H n="04">What the agent will never do</H>
      <ul className="mt-3 space-y-2 font-mono text-[12px]">
        {[
          'Buy a coin with dev-bundle flags at launch.',
          `Buy a coin with fewer than ${R.minHolders} holders.`,
          'Buy a honeypot. Every buy is preceded by a sell simulation.',
          `Put more than ${R.maxInitialSol} SOL into an initial buy, or more than ${R.dipBuys} dip buys into one coin.`,
          'Let a language model decide a trade.',
          'Take an action without a tx or post link.',
        ].map((s) => (<li key={s} className="flex gap-2"><span className="text-loss">✕</span>{s}</li>))}
      </ul>

      <H n="05">What you are looking at</H>
      <p className="mt-3 text-muted">In <b className="text-fg">live</b> mode the coins are real: discovery, price, market cap and volume come from DexScreener, launches and dev-wallet sells from the pump.fun trade feed (with real transaction signatures). &ldquo;Silent&rdquo; means hours since the last on-chain trade, since there is no social feed yet, and holder counts need a Helius key. The agent runs the same rules on <b className="text-fg">paper</b> until it has a funded wallet, so trade rows carry a PAPER tag instead of a tx link and no X posts are made.</p>
      <p className="mt-3 text-muted">In <b className="text-fg">simulator</b> mode everything is generated at 60× speed and tx links carry a SIM tag. The banner at the top of every page says which one you are looking at.</p>
    </article>
  );
}
