'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { OrthographicCamera } from 'three';
import { useStore } from '@/lib/store';
import type { Action } from '@/lib/types';
import { ago } from '@/lib/format';
import { Agent, type AgentProps } from './Agent';
import { Brick, Crane, Desk, Plant, Plate, Sign } from './Props';
import { readPalette, type Palette } from './palette';
import { BY_ROLE } from '@/lib/characters';

type Slot = Pick<AgentProps, 'title' | 'line' | 'lineKey' | 'tone' | 'icon'> & { href: string };

/** Map the live simulator onto the five desks. */
function useDesks(): Record<'scanner' | 'trader' | 'poster' | 'community' | 'treasurer', Slot> {
  const snap = useStore((s) => s.snap);
  return useMemo(() => {
    const acts = snap?.actions ?? [];
    const now = snap?.now ?? 0;
    const find = (ks: Action['kind'][]) => acts.find((a) => ks.includes(a.kind));
    const flag = find(['flag']);
    const trade = find(['takeover', 'buy', 'sell', 'abandon']);
    const post = find(['post']);
    const reply = find(['reply']);
    const claim = find(['claim']);
    const dying = snap?.tokens.filter((t) => t.status === 'dying' || t.status === 'dead').length ?? 0;
    const tradeLine = trade
      ? `${trade.kind === 'takeover' ? 'TAKEOVER' : trade.kind.toUpperCase()} $${trade.ticker} · ${(trade.amount ?? 0).toFixed(3)} SOL`
      : 'Waiting for an eligible coin';
    return {
      scanner: {
        title: BY_ROLE.scanner.name, icon: BY_ROLE.scanner.icon, href: BY_ROLE.scanner.href,
        line: flag ? `$${flag.ticker} flagged · ${dying} dying` : `Scanning ${snap?.stats.scanned.toLocaleString('en-US') ?? ''} coins`,
        lineKey: flag?.id ?? 'scan', tone: 'loss',
      },
      trader: {
        title: BY_ROLE.trader.name, icon: BY_ROLE.trader.icon, href: BY_ROLE.trader.href,
        line: tradeLine, lineKey: trade?.id ?? 'trade',
        tone: trade?.kind === 'sell' ? 'gain' : trade?.kind === 'abandon' ? 'fg' : 'accent',
      },
      poster: {
        title: BY_ROLE.poster.name, icon: BY_ROLE.poster.icon, href: BY_ROLE.poster.href,
        line: post ? `@${post.ticker.slice(0, 12)}CTO · ${ago(post.at, now)} ago` : 'Drafting the next update',
        lineKey: post?.id ?? 'post', tone: 'fg',
      },
      community: {
        title: BY_ROLE.community.name, icon: BY_ROLE.community.icon, href: BY_ROLE.community.href,
        line: reply ? `Reply on $${reply.ticker} · ${ago(reply.at, now)} ago` : 'Reading mentions',
        lineKey: reply?.id ?? 'reply', tone: 'fg',
      },
      treasurer: {
        title: BY_ROLE.treasurer.name, icon: BY_ROLE.treasurer.icon, href: BY_ROLE.treasurer.href,
        line: claim ? `+${(claim.amount ?? 0).toFixed(3)} SOL · vault ${snap?.agent.vaultSol.toFixed(1)}` : `Vault ${snap?.agent.vaultSol.toFixed(1) ?? '—'} SOL`,
        lineKey: claim?.id ?? 'claim', tone: 'gain',
      },
    };
  }, [snap]);
}

function Fit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    cam.zoom = Math.max(19, Math.min(40, size.width / 21));
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export type Role = 'scanner' | 'trader' | 'poster' | 'community' | 'treasurer';

function Office({ pal, onSelect }: { pal: Palette; onSelect?: (r: Role) => void }) {
  const router = useRouter();
  const d = useDesks();
  const { size } = useThree();
  // labels are nudged apart in screen space; pull them in on narrow canvases
  const k = Math.max(0.3, Math.min(1, size.width / 760));
  const off = (x: number, y: number): [number, number] => [size.width < 560 ? 0 : x * k, y * k];
  const go = (role: Role) => () => (onSelect ? onSelect(role) : router.push(d[role].href));
  const wall = pal.dark ? '#26262b' : '#f1f1f3';
  const floor = pal.dark ? '#1c1c20' : '#ffffff';
  const floor2 = pal.dark ? '#232328' : '#f7f7f8';
  const look = (r: keyof typeof BY_ROLE) => { const c = BY_ROLE[r]; return { color: c.shirt, skin: c.skin, hat: c.hat, glasses: c.glasses, beard: c.beard }; };

  return (
    <group position={[0, -1.1, 0]}>
      {/* ground + floor plates */}
      <Plate x={0} z={0} w={13} d={10} y={-0.3} color={floor} studColor={pal.line} />
      <Plate x={-2.5} z={-1} w={7} d={6} y={0} h={0.2} color={floor2} studColor={pal.line} />

      {/* walls (L-shape at the back) */}
      <mesh position={[0, 1.6, -5.1]} receiveShadow><boxGeometry args={[13, 3.2, 0.3]} /><meshStandardMaterial color={wall} roughness={0.9} /></mesh>
      <mesh position={[-6.6, 1.6, 0]} receiveShadow><boxGeometry args={[0.3, 3.2, 10]} /><meshStandardMaterial color={wall} roughness={0.9} /></mesh>
      {/* windows */}
      {[-3.5, 0, 3.5].map((x) => (
        <mesh key={x} position={[x, 1.9, -4.93]}><boxGeometry args={[1.6, 1.2, 0.04]} /><meshStandardMaterial color={pal.accent} emissive={pal.accent} emissiveIntensity={pal.dark ? 0.25 : 0.05} transparent opacity={0.35} /></mesh>
      ))}
      {/* accent stripe + sign */}
      <mesh position={[0, 3.3, -5.1]}><boxGeometry args={[13, 0.2, 0.34]} /><meshStandardMaterial color={pal.accent} /></mesh>
      <Sign text="CTO" position={[2.2, 3.45, -5.0]} color={pal.accent} pal={pal} unit={0.26} depth={0.5} />

      {/* desks + agents */}
      <Desk position={[-4.6, 0.2, -3.2]} pal={pal} screen="scan" screenColor={pal.loss} />
      <Agent position={[-4.6, 0.2, -2.3]} labelY={2.1} labelOffset={off(-40, -26)} pal={pal} {...look('scanner')} pose="type" onClick={go('scanner')} {...d.scanner} />

      <Desk position={[-0.6, 0.2, -3.2]} pal={pal} screen="chart" screenColor={pal.accent} />
      <Agent position={[-0.6, 0.2, -2.3]} labelY={2.6} labelOffset={off(70, -50)} pal={pal} {...look('trader')} pose="type" speed={1.3} onClick={go('trader')} {...d.trader} />

      <Desk position={[3.6, 0.2, -3.2]} pal={pal} screen="x" screenColor={pal.fg} />
      <Agent position={[3.6, 0.2, -2.3]} labelY={2.1} labelOffset={off(90, 0)} pal={pal} {...look('poster')} pose="type" speed={0.8} onClick={go('poster')} {...d.poster} />

      <Agent position={[-3.8, 0.2, 1.8]} rotation={0.9} labelY={2.1} labelOffset={off(-80, 10)} pal={pal} {...look('community')} pose="phone" onClick={go('community')} {...d.community} />

      <Desk position={[2.4, 0, 1.6]} rotation={Math.PI} pal={pal} screen="wallet" screenColor={pal.gain} />
      <Agent position={[2.4, 0, 0.7]} rotation={Math.PI} labelY={2.3} labelOffset={off(40, 40)} pal={pal} {...look('treasurer')} pose="type" speed={1.1} onClick={go('treasurer')} {...d.treasurer} />

      {/* dressing */}
      <Plant position={[-6.0, 0, -4.4]} pal={pal} />
      <Plant position={[5.8, 0, -4.4]} pal={pal} />
      <Plant position={[-6.0, 0, 3.8]} pal={pal} />
      <Crane position={[-7.6, -0.3, -3.8]} pal={pal} />
      <Brick position={[-1.2, 0.18, 3.6]} color={pal.accent} rotation={0.3} />
      <Brick position={[0.2, 0.18, 4.1]} color={pal.loss} rotation={-0.5} />
      <Brick position={[-0.4, 0.53, 3.8]} color={pal.gain} rotation={0.1} />
      <Brick position={[5.2, 0.18, -1.4]} color={pal.line} rotation={1.1} />

      <ContactShadows position={[0, -0.29, 0]} opacity={pal.dark ? 0.5 : 0.3} scale={22} blur={2.2} far={6} resolution={512} color="#000" />
    </group>
  );
}

export function Scene({ className = '', onSelect }: { className?: string; onSelect?: (r: Role) => void }) {
  const [pal, setPal] = useState<Palette>(() => readPalette());
  useEffect(() => {
    setPal(readPalette());
    const mo = new MutationObserver(() => setPal(readPalette()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className={`select-none ${className}`} style={{ background: pal.bg }}>
      <Canvas
        orthographic
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [16, 13, 16], zoom: 40, near: -60, far: 120 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Fit />
        <ambientLight intensity={pal.dark ? 0.55 : 0.9} />
        <directionalLight position={[8, 14, 6]} intensity={pal.dark ? 1.4 : 1.8} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
          <orthographicCamera attach="shadow-camera" args={[-14, 14, 14, -14, 0.1, 50]} />
        </directionalLight>
        <directionalLight position={[-6, 6, -4]} intensity={0.35} />
        <Office pal={pal} onSelect={onSelect} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minPolarAngle={0.75}
          maxPolarAngle={1.25}
          minAzimuthAngle={Math.PI / 4 - 0.7}
          maxAzimuthAngle={Math.PI / 4 + 0.7}
          target={[-0.4, 0.6, -0.6]}
        />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] text-muted">drag to look around · click an agent for its log</div>
    </div>
  );
}
