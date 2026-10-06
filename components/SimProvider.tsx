'use client';

import { useEffect } from 'react';
import { createSource } from '@/lib/source';
import { useStore } from '@/lib/store';

export function SimProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const src = createSource();
    const stop = src.start((snap, fresh) => useStore.getState().apply(snap, fresh, src.speed));
    return stop;
  }, []);
  return <>{children}</>;
}
