'use client';

import { useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useStore } from '@/lib/store';
import { CTO_CA, pumpUrl, txUrl } from '@/lib/links';
import { hashStr, mulberry32, base58 } from '@/lib/rng';
import { ago, short, stamp } from '@/lib/format';
import { CopyText, SimTag, Skeleton } from '@/components/ui';

const CTO_SUPPLY = 1_000_000_000;

export default function HoldersPage() {
  const snap = useStore((s) => s.snap);
  const { publicKey, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [claimedUpTo, setClaimedUpTo] = useState<Record<string, number>>({});
  const [claims, setClaims] = useState<{ sol: number; sig: string; at: number }[]>([]);
  const [busy, setBusy] = useState(false);

  const me = publicKey?.toBase58();
  // Mock balance: deterministic per wallet. Phase 2: read the SPL token account.
  const balance = useMemo(() => (me ? Math.round(mulberry32(hashStr(me))() * 4_000_000 + 250_000) : 0), [me]);
  const share = balance / CTO_SUPPLY;

  if (!snap) return <div className="py-6"><Skeleton rows={10} /></div>;
  const dists = snap.distributions;
  const since = me ? claimedUpTo[me] ?? 0 : 0;
  const claimable = me ? dists.filter((d) => d.at > since).reduce((s, d) => s + d.sol * share, 0) : 0;
  const lifetime = dists.reduce((s, d) => s + d.sol, 0);

  const claim = async () => {
    if (!me || claimable <= 0) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 900));
    const sig = base58(mulberry32(hashStr(me + snap.now)), 88);
    setClaims((c) => [{ sol: claimable, sig, at: snap.now }, ...c]);
    setClaimedUpTo((m) => ({ ...m, [me]: snap.now }));
    setBusy(false);
  };

  return (
    <div className="py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">CTO holders</h1>
          <div className="mt-1 flex items-center gap-2 text-muted">CA <CopyText text={CTO_CA} display={CTO_CA} /></div>
        </div>
        <a href={pumpUrl(CTO_CA)} target="_blank" rel="noreferrer" className="btn-primary">Buy CTO ↗</a>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        {[
          ['Holders', snap.ctoHolders.toLocaleString('en-US')],
          ['Paid to holders', `${lifetime.toFixed(3)} SOL`],
          ['Pending next epoch', `${snap.agent.pendingToHolders.toFixed(3)} SOL`],
          ['Distributions', String(dists.length)],
        ].map(([k, v]) => (
          <div key={k} className="bg-bg px-4 py-3"><div className="label">{k}</div><div className="num mt-1 text-[20px] font-semibold">{v}</div></div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <section className="card h-fit bg-bg">
          <div className="border-b border-line px-4 py-2"><h2 className="text-[14px] font-semibold">Your claimable share</h2></div>
          {!me ? (
            <div className="p-4">
              <p className="text-muted">Connect a wallet holding CTO to see and claim your share of fee distributions.</p>
              <button onClick={() => setVisible(true)} className="btn-primary mt-3 w-full">Connect wallet</button>
              <p className="mt-2 text-center text-[11px] text-muted">Phantom · Backpack · Solflare</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between font-mono text-[12px]">
                <span className="text-muted">{wallet?.adapter.name}</span>
                <button onClick={() => disconnect()} className="text-muted hover:text-fg">{short(me)} · disconnect</button>
              </div>
              <div className="mt-3 divide-y divide-line font-mono text-[12px]">
                <div className="flex justify-between py-1.5"><span className="text-muted">CTO balance (mock)</span><span className="num">{balance.toLocaleString('en-US')}</span></div>
                <div className="flex justify-between py-1.5"><span className="text-muted">Share of supply</span><span className="num">{(share * 100).toFixed(4)}%</span></div>
                <div className="flex justify-between py-1.5"><span className="text-muted">Claimable</span><span className="num text-[15px] font-semibold text-gain">{claimable.toFixed(6)} SOL</span></div>
              </div>
              <button onClick={claim} disabled={busy || claimable <= 0} className="btn-primary mt-3 w-full disabled:opacity-40">
                {busy ? 'Claiming…' : claimable > 0 ? `Claim ${claimable.toFixed(6)} SOL` : 'Nothing to claim'}
              </button>
              <p className="mt-2 text-[11px] text-muted">Claim is mocked in Phase 1: no transaction is sent and no signature is requested.</p>
              {claims.length > 0 && (
                <ul className="mt-3 divide-y divide-line border-t border-line">
                  {claims.map((c) => (
                    <li key={c.sig} className="flex items-center justify-between py-1.5 font-mono text-[11px]">
                      <span>+{c.sol.toFixed(6)} SOL</span>
                      <a className="link" href={txUrl(c.sig)} target="_blank" rel="noreferrer">tx {c.sig.slice(0, 6)}↗<SimTag /></a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="card overflow-hidden bg-bg">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <h2 className="text-[14px] font-semibold">Fee distribution history</h2>
            <span className="font-mono text-[11px] text-muted">every 6h · 70% of claims + realized PnL</span>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-bg text-[11px] uppercase tracking-wider text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">Epoch</th><th className="px-4 py-2 font-medium">Time</th><th className="px-4 py-2 text-right font-medium">SOL</th>
                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Recipients</th><th className="hidden px-4 py-2 text-right font-medium md:table-cell">Per 1M CTO</th>
                  {me && <th className="px-4 py-2 text-right font-medium">You</th>}<th className="px-4 py-2 text-right font-medium">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono">
                {dists.map((d) => (
                  <tr key={d.id} className="hover:bg-surface">
                    <td className="px-4 py-2 text-muted">#{d.id.slice(1)}</td>
                    <td className="px-4 py-2" title={stamp(d.at)}>{stamp(d.at)} <span className="text-muted">({ago(d.at, snap.now)})</span></td>
                    <td className="num px-4 py-2 text-right text-gain">{d.sol.toFixed(3)}</td>
                    <td className="num hidden px-4 py-2 text-right sm:table-cell">{d.recipients.toLocaleString('en-US')}</td>
                    <td className="num hidden px-4 py-2 text-right md:table-cell">{d.perMillion.toFixed(6)}</td>
                    {me && <td className={`num px-4 py-2 text-right ${d.at > since ? 'text-fg' : 'text-muted line-through'}`}>{(d.sol * share).toFixed(6)}</td>}
                    <td className="px-4 py-2 text-right"><a className="link" href={txUrl(d.txSig)} target="_blank" rel="noreferrer">{d.txSig.slice(0, 6)}↗</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!dists.length && <p className="p-6 text-center text-muted">No distributions yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
