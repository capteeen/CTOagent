'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Scene = dynamic(() => import('./Scene').then((m) => m.Scene), { ssr: false, loading: () => null });

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** The CTO HQ: five voxel agents working the live feed. Falls back to nothing if WebGL is missing. */
export function HQ({ className = '' }: { className?: string }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(webglOk()), []);
  if (ok === false) return null;
  return (
    <div className={`hq relative overflow-hidden rounded-lg border border-line ${className}`}>
      {ok === null ? <div className="absolute inset-0 animate-pulse bg-surface" /> : <Scene className="absolute inset-0 h-full w-full" />}
    </div>
  );
}
