'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Palette } from './palette';

const Mat = ({ c, e = 0 }: { c: string; e?: number }) => <meshStandardMaterial color={c} roughness={0.8} emissive={c} emissiveIntensity={e} />;

/** A brick plate with studs on top. Studs are instanced. */
export function Plate({ x, z, w, d, y = 0, h = 0.3, color, studColor }: { x: number; z: number; w: number; d: number; y?: number; h?: number; color: string; studColor?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = w * d;
  useMemo(() => {
    requestAnimationFrame(() => {
      const m = ref.current;
      if (!m) return;
      const o = new THREE.Object3D();
      let i = 0;
      for (let ix = 0; ix < w; ix++)
        for (let iz = 0; iz < d; iz++) {
          o.position.set(x - w / 2 + ix + 0.5, y + h + 0.05, z - d / 2 + iz + 0.5);
          o.updateMatrix();
          m.setMatrixAt(i++, o.matrix);
        }
      m.instanceMatrix.needsUpdate = true;
    });
  }, [x, z, w, d, y, h]);
  return (
    <group>
      <mesh position={[x, y + h / 2, z]} receiveShadow castShadow>
        <boxGeometry args={[w, h, d]} />
        <Mat c={color} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.1, 12]} />
        <Mat c={studColor ?? color} />
      </instancedMesh>
    </group>
  );
}

export function Desk({ position, rotation = 0, pal, screen, screenColor }: { position: [number, number, number]; rotation?: number; pal: Palette; screen?: 'chart' | 'x' | 'feed' | 'wallet' | 'scan'; screenColor: string }) {
  const sref = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    if (sref.current) {
      const m = sref.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = 0.55 + Math.sin(clock.elapsedTime * 3 + phase) * 0.12;
    }
  });
  const wood = pal.dark ? '#2a2a30' : '#ffffff';
  const legc = pal.dark ? '#3a3a42' : '#d7d7dc';
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow><boxGeometry args={[1.6, 0.08, 0.8]} /><Mat c={wood} /></mesh>
      {[[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]}><boxGeometry args={[0.08, 0.72, 0.08]} /><Mat c={legc} /></mesh>
      ))}
      {/* monitor */}
      <mesh position={[0, 0.82, -0.25]}><boxGeometry args={[0.3, 0.12, 0.2]} /><Mat c={legc} /></mesh>
      <mesh position={[0, 1.18, -0.3]} castShadow><boxGeometry args={[1.0, 0.62, 0.06]} /><Mat c={pal.fg} /></mesh>
      <mesh ref={sref} position={[0, 1.18, -0.265]}><boxGeometry args={[0.9, 0.52, 0.01]} /><meshStandardMaterial color={screenColor} emissive={screenColor} emissiveIntensity={0.6} /></mesh>
      <ScreenContent kind={screen ?? 'feed'} pal={pal} />
      {/* keyboard + mug */}
      <mesh position={[0, 0.78, 0.12]}><boxGeometry args={[0.6, 0.04, 0.2]} /><Mat c={legc} /></mesh>
      <mesh position={[0.6, 0.82, 0.15]}><cylinderGeometry args={[0.07, 0.06, 0.14, 10]} /><Mat c={pal.accent} /></mesh>
    </group>
  );
}

function ScreenContent({ kind, pal }: { kind: 'chart' | 'x' | 'feed' | 'wallet' | 'scan'; pal: Palette }) {
  const z = -0.258;
  const y = 1.18;
  if (kind === 'chart') {
    const bars = [0.1, 0.18, 0.14, 0.26, 0.2, 0.34, 0.3, 0.42];
    return (
      <group>
        {bars.map((h, i) => (
          <mesh key={i} position={[-0.35 + i * 0.1, y - 0.22 + h / 2, z]}><boxGeometry args={[0.06, h, 0.01]} /><Mat c={i % 3 === 1 ? pal.loss : pal.accent} e={0.4} /></mesh>
        ))}
      </group>
    );
  }
  if (kind === 'x') {
    return (
      <group>
        <mesh position={[0, y, z]} rotation={[0, 0, 0.75]}><boxGeometry args={[0.05, 0.42, 0.01]} /><Mat c={pal.bg} e={0.5} /></mesh>
        <mesh position={[0, y, z]} rotation={[0, 0, -0.75]}><boxGeometry args={[0.05, 0.42, 0.01]} /><Mat c={pal.bg} e={0.5} /></mesh>
      </group>
    );
  }
  if (kind === 'scan') {
    return (
      <group>
        <mesh position={[-0.05, y + 0.03, z]}><torusGeometry args={[0.12, 0.03, 8, 24]} /><Mat c={pal.bg} e={0.5} /></mesh>
        <mesh position={[0.12, y - 0.14, z]} rotation={[0, 0, -0.8]}><boxGeometry args={[0.04, 0.16, 0.01]} /><Mat c={pal.bg} e={0.5} /></mesh>
      </group>
    );
  }
  if (kind === 'wallet') {
    return (
      <group>
        <mesh position={[0, y, z]}><boxGeometry args={[0.4, 0.26, 0.01]} /><Mat c={pal.bg} e={0.5} /></mesh>
        <mesh position={[0.12, y, z - 0.002]}><boxGeometry args={[0.1, 0.08, 0.01]} /><Mat c={pal.gain} e={0.5} /></mesh>
      </group>
    );
  }
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.1 + (i % 2) * 0.05, y + 0.16 - i * 0.11, z]}><boxGeometry args={[0.55 - (i % 2) * 0.15, 0.04, 0.01]} /><Mat c={pal.bg} e={0.5} /></mesh>
      ))}
    </group>
  );
}

export function Plant({ position, pal }: { position: [number, number, number]; pal: Palette }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.2, 0.16, 0.4, 10]} /><Mat c={pal.dark ? '#3a3a42' : '#d7d7dc'} /></mesh>
      <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.4, 0.4, 0.4]} /><Mat c={pal.gain} /></mesh>
      <mesh position={[0.1, 0.9, 0.1]} castShadow><boxGeometry args={[0.3, 0.3, 0.3]} /><Mat c={pal.gain} /></mesh>
    </group>
  );
}

/** Voxel sign built from a bitmap. */
export function Sign({ text, position, color, pal, depth = 0.4, unit = 0.26 }: { text: string; position: [number, number, number]; color: string; pal: Palette; depth?: number; unit?: number }) {
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    let cx = 0;
    for (const ch of text) {
      const g = GLYPHS[ch] ?? GLYPHS[' '];
      g.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') out.push([cx + rx, 4 - ry]);
      });
      cx += g[0].length + 1;
    }
    const w = cx - 1;
    return { cells: out, w };
  }, [text]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useMemo(() => {
    requestAnimationFrame(() => {
      const m = ref.current;
      if (!m) return;
      const o = new THREE.Object3D();
      cells.cells.forEach(([x, y], i) => {
        o.position.set((x - cells.w / 2 + 0.5) * unit, (y + 0.5) * unit, 0);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    });
  }, [cells, unit]);
  return (
    <group position={position}>
      <instancedMesh ref={ref} args={[undefined, undefined, cells.cells.length]} castShadow>
        <boxGeometry args={[unit, unit, depth]} />
        <Mat c={color} e={pal.dark ? 0.25 : 0} />
      </instancedMesh>
    </group>
  );
}

const GLYPHS: Record<string, string[]> = {
  C: ['.###', '#...', '#...', '#...', '.###'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  ' ': ['..', '..', '..', '..', '..'],
};

export function Crane({ position, pal }: { position: [number, number, number]; pal: Palette }) {
  const arm = useRef<THREE.Group>(null);
  const hook = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (arm.current) arm.current.rotation.y = Math.sin(t * 0.25) * 0.7 + 0.6;
    if (hook.current) hook.current.position.y = -1.2 + Math.sin(t * 0.6) * 0.5;
  });
  const steel = pal.accent;
  return (
    <group position={position}>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.6 + 0.3, 0]} castShadow><boxGeometry args={[0.35, 0.6, 0.35]} /><Mat c={i % 2 ? steel : pal.fg} /></mesh>
      ))}
      <group ref={arm} position={[0, 4.4, 0]}>
        <mesh position={[1.6, 0, 0]} castShadow><boxGeometry args={[4.4, 0.3, 0.3]} /><Mat c={steel} /></mesh>
        <mesh position={[-1.0, 0, 0]} castShadow><boxGeometry args={[0.8, 0.5, 0.5]} /><Mat c={pal.fg} /></mesh>
        <group ref={hook} position={[3.2, -1.2, 0]}>
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.03, 1.4, 0.03]} /><Mat c={pal.muted} /></mesh>
          <mesh castShadow><boxGeometry args={[0.6, 0.3, 0.4]} /><Mat c={pal.accent} /></mesh>
          {[-0.15, 0.15].map((x) => <mesh key={x} position={[x, 0.2, 0]}><cylinderGeometry args={[0.08, 0.08, 0.1, 10]} /><Mat c={pal.accent} /></mesh>)}
        </group>
      </group>
    </group>
  );
}

export function Brick({ position, color, rotation = 0 }: { position: [number, number, number]; color: string; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow><boxGeometry args={[0.8, 0.35, 0.45]} /><Mat c={color} /></mesh>
      {[-0.2, 0.2].map((x) => <mesh key={x} position={[x, 0.22, 0]}><cylinderGeometry args={[0.1, 0.1, 0.1, 10]} /><Mat c={color} /></mesh>)}
    </group>
  );
}
