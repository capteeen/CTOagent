'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Agent } from './Agent';
import { readPalette, SKIN, type Palette } from './palette';

/** A single waving agent, used as the sidebar mascot. */
export function Mascot() {
  const [pal, setPal] = useState<Palette>(() => readPalette());
  useEffect(() => {
    setPal(readPalette());
    const mo = new MutationObserver(() => setPal(readPalette()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return (
    <Canvas orthographic dpr={[1, 1.5]} camera={{ position: [3, 2.4, 4], zoom: 56, near: -20, far: 40 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} style={{ background: 'transparent' }}>
      <ambientLight intensity={pal.dark ? 0.7 : 1} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <group position={[0, -0.95, 0]}>
        <Agent position={[0, 0, 0]} rotation={-0.4} pal={pal} color={pal.accent} skin={SKIN[0]} hat={pal.accent} pose="wave" title="" line="" lineKey="" icon="" labelY={99} />
      </group>
    </Canvas>
  );
}
