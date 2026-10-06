'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import { useStore } from '@/lib/store';
import type { Token } from '@/lib/types';
import { usd } from '@/lib/format';
import { Plate } from './Props';
import { readPalette, type Palette } from './palette';

const COLS = 6;
const GAP = 1.6;

function Tomb({ t, pal, pos, onOpen }: { t: Token; pal: Palette; pos: [number, number, number]; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  const ref = useRef<Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    const target = hover ? 1.15 : 1;
    ref.current.scale.setScalar(ref.current.scale.x + (target - ref.current.scale.x) * Math.min(1, dt * 10));
    if (t.status === 'revived') ref.current.rotation.y = Math.sin(clock.elapsedTime * 1.2 + seed) * 0.08;
    if (t.status === 'taken_over') ref.current.position.y = pos[1] + Math.abs(Math.sin(clock.elapsedTime * 2 + seed)) * 0.08;
  });
  const stone = pal.dark ? '#3a3a42' : '#c9c9cf';
  const shape =
    t.status === 'revived' ? (
      <group>
        <mesh position={[0, 0.18, 0]} castShadow><cylinderGeometry args={[0.32, 0.26, 0.36, 10]} /><meshStandardMaterial color={pal.dark ? '#4a3a2a' : '#b08968'} /></mesh>
        <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.4, 0.5, 0.4]} /><meshStandardMaterial color={pal.gain} /></mesh>
        <mesh position={[0.15, 0.95, 0.1]} castShadow><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color={pal.gain} /></mesh>
        <mesh position={[-0.18, 0.85, -0.1]} castShadow><boxGeometry args={[0.22, 0.22, 0.22]} /><meshStandardMaterial color={pal.gain} /></mesh>
      </group>
    ) : t.status === 'taken_over' ? (
      <group>
        <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[0.9, 0.5, 0.6]} /><meshStandardMaterial color={pal.accent} /></mesh>
        {[-0.2, 0.2].map((x) => <mesh key={x} position={[x, 0.55, 0]}><cylinderGeometry args={[0.12, 0.12, 0.1, 10]} /><meshStandardMaterial color={pal.accent} /></mesh>)}
        <mesh position={[0.3, 0.95, 0]}><boxGeometry args={[0.04, 0.9, 0.04]} /><meshStandardMaterial color={pal.fg} /></mesh>
        <mesh position={[0.48, 1.25, 0]}><boxGeometry args={[0.36, 0.22, 0.02]} /><meshStandardMaterial color={pal.accent} /></mesh>
      </group>
    ) : (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.7, 0.9, 0.2]} /><meshStandardMaterial color={stone} roughness={0.9} /></mesh>
        <mesh position={[0, 0.9, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.35, 0.35, 0.2, 20, 1, false, 0, Math.PI]} /><meshStandardMaterial color={stone} roughness={0.9} /></mesh>
        <mesh position={[0, 0.6, 0.11]}><boxGeometry args={[0.36, 0.05, 0.02]} /><meshStandardMaterial color={t.status === 'abandoned' ? pal.muted : pal.loss} /></mesh>
        <mesh position={[0, 0.6, 0.11]}><boxGeometry args={[0.05, 0.3, 0.02]} /><meshStandardMaterial color={t.status === 'abandoned' ? pal.muted : pal.loss} /></mesh>
      </group>
    );
  const tone = t.status === 'revived' ? pal.gain : t.status === 'taken_over' ? pal.accent : t.status === 'abandoned' ? pal.muted : pal.loss;
  return (
    <group
      ref={ref}
      position={pos}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
    >
      {shape}
      <Html position={[0, 1.5, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none', opacity: hover ? 1 : 0, transition: 'opacity 120ms' }}>
        <div className="hq-label" style={{ borderColor: tone, background: pal.dark ? 'rgba(20,20,22,0.94)' : 'rgba(255,255,255,0.96)', color: pal.fg }}>
          <div className="hq-label-title" style={{ color: tone }}>${t.ticker} · {t.status.replace('_', ' ')}</div>
          <div className="hq-label-line">score {t.deathScore} · {usd(t.mcap)} · dev sold {t.devSoldPct.toFixed(0)}%</div>
        </div>
      </Html>
    </group>
  );
}

function Field({ pal, tokens }: { pal: Palette; tokens: Token[] }) {
  const router = useRouter();
  const rows = Math.ceil(tokens.length / COLS);
  const w = COLS * GAP + 1;
  const d = rows * GAP + 1;
  return (
    <group position={[0, -1.1, 0]}>
      <Plate x={0} z={0} w={Math.ceil(w)} d={Math.ceil(d)} y={-0.3} color={pal.dark ? '#1c1c20' : '#ffffff'} studColor={pal.line} />
      {tokens.map((t, i) => {
        const c = i % COLS, r = Math.floor(i / COLS);
        return <Tomb key={t.ca} t={t} pal={pal} pos={[(c - (COLS - 1) / 2) * GAP, 0, (r - (rows - 1) / 2) * GAP]} onOpen={() => router.push(`/token/${t.ca}`)} />;
      })}
      <ContactShadows position={[0, -0.29, 0]} opacity={pal.dark ? 0.5 : 0.3} scale={24} blur={2} far={5} />
    </group>
  );
}

/** Dead coins as tombstones, takeovers as flagged bricks, revived ones as plants. Hover for numbers, click to open. */
export function Graveyard({ className = '', limit = 24 }: { className?: string; limit?: number }) {
  const all = useStore((s) => s.snap?.tokens);
  const tokens = useMemo(() => {
    const rank = { revived: 0, taken_over: 1, dead: 2, abandoned: 3 } as Record<string, number>;
    const per = Math.ceil(limit / 4);
    const pick = (st: string) => (all ?? []).filter((t) => t.status === st).sort((a, b) => (b.takeoverAt ?? b.lastAction?.at ?? 0) - (a.takeoverAt ?? a.lastAction?.at ?? 0)).slice(0, per);
    return [...pick('revived'), ...pick('taken_over'), ...pick('dead'), ...pick('abandoned')].sort((a, b) => rank[a.status] - rank[b.status]).slice(0, limit);
  }, [all, limit]);
  const [pal, setPal] = useState<Palette>(() => readPalette());
  useEffect(() => {
    setPal(readPalette());
    const mo = new MutationObserver(() => setPal(readPalette()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  const counts = useMemo(() => tokens.reduce((m, t) => ((m[t.status] = (m[t.status] ?? 0) + 1), m), {} as Record<string, number>), [tokens]);
  return (
    <div className={`relative ${className}`}>
      <Canvas orthographic shadows dpr={[1, 1.5]} camera={{ position: [12, 11, 12], zoom: 38, near: -60, far: 120 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} style={{ background: 'transparent' }}>
        <ambientLight intensity={pal.dark ? 0.6 : 0.9} />
        <directionalLight position={[6, 12, 5]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]}>
          <orthographicCamera attach="shadow-camera" args={[-14, 14, 14, -14, 0.1, 50]} />
        </directionalLight>
        <Field pal={pal} tokens={tokens} />
        <OrbitControls enableZoom={false} enablePan={false} enableDamping minPolarAngle={0.6} maxPolarAngle={1.25} minAzimuthAngle={Math.PI / 4 - 0.9} maxAzimuthAngle={Math.PI / 4 + 0.9} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-3 flex gap-3 font-mono text-[10px] text-muted">
        <span><span className="text-gain">■</span> revived {counts.revived ?? 0}</span>
        <span><span className="text-accent">■</span> taken over {counts.taken_over ?? 0}</span>
        <span><span className="text-loss">■</span> dead {counts.dead ?? 0}</span>
        <span><span className="text-muted">■</span> abandoned {counts.abandoned ?? 0}</span>
      </div>
    </div>
  );
}
