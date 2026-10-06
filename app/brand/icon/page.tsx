'use client';

import dynamic from 'next/dynamic';
const IconScene = dynamic(() => import('../BrandScene').then((m) => m.IconScene), { ssr: false });

// Render target for the X avatar. Screenshot the #frame element at 400×400.
export default function IconPage() {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#0b0b0d]">
      <div id="frame" className="relative h-[400px] w-[400px] overflow-hidden rounded-none" style={{ background: '#FFC700', backgroundImage: 'radial-gradient(rgb(0 0 0 / 0.16) 4px, transparent 4.5px)', backgroundSize: '28px 28px' }}>
        <div className="absolute inset-0"><IconScene /></div>
        <div className="absolute left-1/2 top-[34px] -translate-x-1/2 rounded-lg bg-[#0a0a0a] px-3 py-1 font-mono text-[22px] font-black tracking-tight text-[#FFC700]">
          CTO
        </div>
      </div>
    </div>
  );
}
