'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Token } from '@/lib/types';
import { scoreParts } from '@/lib/score';
import { useStore } from '@/lib/store';
import { Agent } from './Agent';
import { Plate, Brick } from './Props';
import { readPalette, SKIN, type Palette } from './palette';

/** The coin itself: a fat cylinder with the token image on both faces, spinning. */
function Coin({ image, pal, dead }: { image: string; pal: Palette; dead: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const tex = useLoader(THREE.TextureLoader, image);
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  }, [tex]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * (dead ? 0.25 : 0.9);
    ref.current.position.y = 1.55 + Math.sin(clock.elapsedTime * 1.4) * 0.06;
    if (dead) ref.current.rotation.z = Math.PI / 2 - 0.25; // lying on its side
  });
  const rim = dead ? '#6b6b70' : pal.accent;
  return (
    <group ref={ref}>
      <mesh castShadow>
        <cylinderGeometry args={[0.95, 0.95, 0.22, 48]} />
        <meshStandardMaterial color={rim} metalness={0.35} roughness={0.45} />
      </mesh>
      {[0.115, -0.115].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[i ? Math.PI / 2 : -Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.82, 48]} />
          <meshStandardMaterial map={tex} roughness={0.6} color={dead ? '#8a8a90' : '#ffffff'} />
        </mesh>
      ))}
    </group>
  );
}

/** Death score as a tower of red bricks, 1 brick per 10 points, with the 70 line marked. */
function Tower({ score, threshold, pal, onHover }: { score: number; threshold: number; pal: Palette; onHover: (h: boolean) => void }) {
  const n = Math.max(0, Math.round(score / 10));
  const refs = useRef<THREE.Group>(null);
  const [vis, setVis] = useState(0);
  useFrame((_, dt) => setVis((v) => Math.min(n, v + dt * 6)));
  return (
    <group ref={refs} position={[2.3, 0, 0.3]} onPointerOver={() => onHover(true)} onPointerOut={() => onHover(false)}>
      {Array.from({ length: Math.ceil(vis) }).map((_, i) => {
        const strong = (i + 1) * 10 >= threshold;
        const scale = i + 1 > vis ? vis - i : 1;
        return <group key={i} position={[0, 0.18 + i * 0.36, 0]} scale={[1, scale, 1]}><Brick position={[0, 0, 0]} color={strong ? pal.loss : '#b23b43'} rotation={(i % 2) * 0.03} /></group>;
      })}
      {/* threshold marker */}
      <mesh position={[0, 0.18 + (threshold / 10) * 0.36 - 0.18, 0]}>
        <boxGeometry args={[1.1, 0.02, 0.7]} />
        <meshStandardMaterial color={pal.fg} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function Stage({ t, pal }: { t: Token; pal: Palette }) {
  const [hover, setHover] = useState(false);
  const p = scoreParts(t);
  const dead = t.status === 'dead' || t.status === 'abandoned';
  const taken = t.status === 'taken_over' || t.status === 'revived';
  const hat = t.status === 'revived' ? pal.gain : pal.accent;
  const floor = pal.dark ? '#1c1c20' : '#ffffff';
  return (
    <group position={[-0.6, -1.3, 0]}>
      <Plate x={0.6} z={0} w={7} d={5} y={-0.3} color={floor} studColor={pal.line} />
      <group position={[-0.9, 0, 0.2]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.15, 1.25, 0.6, 32]} />
          <meshStandardMaterial color={pal.dark ? '#2a2a30' : '#e6e6ea'} roughness={0.8} />
        </mesh>
        <Coin image={t.image} pal={pal} dead={dead} />
      </group>
      <Tower score={t.deathScore} threshold={70} pal={pal} onHover={setHover} />
      <Html position={[2.3, 0.18 + Math.max(1, Math.round(t.deathScore / 10)) * 0.36 + 0.5, 0.3]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="hq-label" style={{ borderColor: hover ? pal.loss : pal.line, background: pal.dark ? 'rgba(20,20,22,0.92)' : 'rgba(255,255,255,0.94)', color: pal.fg }}>
          <div className="hq-label-title" style={{ color: pal.loss }}>death {t.deathScore}/100</div>
          {hover ? (
            <div className="hq-label-line">dev {p.dev.toFixed(0)} · quiet {p.social.toFixed(0)} · vol {p.volume.toFixed(0)} · holders {p.holders.toFixed(0)}</div>
          ) : (
            <div className="hq-label-line">{t.deathScore >= 70 ? 'over the takeover line' : `${70 - t.deathScore} to the line`}</div>
          )}
        </div>
      </Html>
      {taken && (
        <Agent position={[-3.0, 0, 1.2]} rotation={0.6} pal={pal} color={pal.dark ? '#34343b' : '#2a2a33'} skin={SKIN[2]} hat={hat} pose="wave" title="CTO" icon="◎" line={t.status === 'revived' ? 'revived · holding' : `holding ${t.position.sol.toFixed(2)} SOL`} lineKey={t.status} labelY={2.0} tone={t.status === 'revived' ? 'gain' : 'accent'} />
      )}
      {dead && !taken && (
        <group position={[-3.0, 0, 1.2]}>
          {/* tombstone */}
          <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.9, 1.1, 0.25]} /><meshStandardMaterial color={pal.dark ? '#3a3a42' : '#c9c9cf'} roughness={0.9} /></mesh>
          <mesh position={[0, 1.1, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.25, 24, 1, false, 0, Math.PI]} /><meshStandardMaterial color={pal.dark ? '#3a3a42' : '#c9c9cf'} roughness={0.9} /></mesh>
          <mesh position={[0, 0.7, 0.13]}><boxGeometry args={[0.5, 0.06, 0.02]} /><meshStandardMaterial color={pal.fg} /></mesh>
          <mesh position={[0, 0.7, 0.13]}><boxGeometry args={[0.06, 0.4, 0.02]} /><meshStandardMaterial color={pal.fg} /></mesh>
        </group>
      )}
      <ContactShadows position={[0, -0.29, 0]} opacity={pal.dark ? 0.5 : 0.3} scale={14} blur={2} far={5} />
    </group>
  );
}

export function CoinStage({ ca, className = '' }: { ca: string; className?: string }) {
  const t = useStore((s) => s.byCa.get(ca));
  const [pal, setPal] = useState<Palette>(() => readPalette());
  useEffect(() => {
    setPal(readPalette());
    const mo = new MutationObserver(() => setPal(readPalette()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  const key = useMemo(() => (t ? `${t.ca}:${t.status}` : ''), [t]);
  if (!t) return null;
  return (
    <div className={`relative ${className}`}>
      <Canvas key={key} orthographic shadows dpr={[1, 1.5]} camera={{ position: [8, 6.5, 8], zoom: 60, near: -40, far: 80 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} style={{ background: 'transparent' }}>
        <ambientLight intensity={pal.dark ? 0.6 : 0.9} />
        <directionalLight position={[5, 9, 4]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <Stage t={t} pal={pal} />
      </Canvas>
    </div>
  );
}
