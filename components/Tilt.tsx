'use client';

import { useRef } from 'react';

/** Subtle 3D tilt toward the pointer. CSS only, no library. */
export function Tilt({ children, className = '', max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-2px)`;
    el.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = '';
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`tilt ${className}`}>
      {children}
    </div>
  );
}
