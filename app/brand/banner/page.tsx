'use client';

import dynamic from 'next/dynamic';
const BannerScene = dynamic(() => import('../BrandScene').then((m) => m.BannerScene), { ssr: false });

// Render target for the X header. Screenshot the #frame element at 1500×500.
export default function BannerPage() {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-auto bg-[#000]">
      <div id="frame" className="relative h-[500px] w-[1500px] overflow-hidden bg-[#0b0b0d]" style={{ backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.07) 1.5px, transparent 2px)', backgroundSize: '24px 24px' }}>
        <div className="absolute inset-y-0 right-0 w-[860px]"><BannerScene /></div>
        <div className="absolute inset-y-0 left-0 w-[760px] bg-gradient-to-r from-[#0b0b0d] via-[#0b0b0d]/95 to-transparent" />
        <div className="absolute left-[72px] top-[88px]">
          <div className="flex items-center gap-3">
            <span className="relative grid h-14 w-14 place-items-center rounded-xl bg-[#FFC700] font-mono text-[18px] font-black text-[#0a0a0a] shadow-[0_5px_0_0_rgba(255,199,0,0.45)]">
              CTO
              <span className="absolute -top-1.5 left-3 h-2.5 w-2.5 rounded-sm bg-[#FFC700]" />
              <span className="absolute -top-1.5 right-3 h-2.5 w-2.5 rounded-sm bg-[#FFC700]" />
            </span>
            <span className="text-[34px] font-black tracking-tight text-white">CT<span className="text-[#FFC700]">O</span></span>
          </div>
          <h1 className="mt-6 text-[64px] font-black leading-[0.98] tracking-[-0.035em] text-white">
            Dead coins are
            <br />
            <span className="text-[#FFC700]">fee streams.</span>
          </h1>
          <p className="mt-5 max-w-[520px] text-[19px] leading-snug text-[#c9c9d0]">The agent that takes over abandoned coins. Buys the dip, runs the socials, pays holders.</p>
          <div className="mt-6 flex gap-2 font-mono text-[13px] font-bold">
            <span className="rounded-md border border-[#2a2a30] bg-[#161619] px-2.5 py-1.5 text-[#22c55e]">● MAINNET</span>
            <span className="rounded-md border border-[#2a2a30] bg-[#161619] px-2.5 py-1.5 text-[#c9c9d0]">SOLANA</span>
            <span className="rounded-md bg-[#FFC700] px-2.5 py-1.5 text-[#0a0a0a]">cto.fun</span>
          </div>
        </div>
      </div>
    </div>
  );
}
