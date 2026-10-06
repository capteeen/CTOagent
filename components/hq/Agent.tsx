'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import type { Palette } from './palette';

export interface AgentProps {
  position: [number, number, number];
  rotation?: number;
  /** body (shirt) color */
  color: string;
  skin: string;
  hat: string;
  pal: Palette;
  title: string;
  line: string;
  /** changes when the line changes; used to flash the label */
  lineKey: string;
  /** 'type' = at a desk, 'phone' = holding a phone, 'wave' = idle */
  pose: 'type' | 'phone' | 'wave';
  tone?: 'accent' | 'loss' | 'gain' | 'fg';
  speed?: number;
  onClick?: () => void;
  icon: string;
  labelY?: number;
  /** screen-space nudge in px so neighbouring labels don't collide */
  labelOffset?: [number, number];
  glasses?: boolean;
  beard?: boolean;
}

function Box({ p, s, c, e }: { p: [number, number, number]; s: [number, number, number]; c: string; e?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.75} metalness={0} emissive={e ? c : '#000'} emissiveIntensity={e ?? 0} />
    </mesh>
  );
}

/** A procedural voxel worker. Built from boxes so there are no assets to load. */
export function Agent({ position, rotation = 0, color, skin, hat, pal, title, line, lineKey, pose, tone = 'fg', speed = 1, onClick, icon, labelY = 2.05, labelOffset = [0, 0], glasses, beard }: AgentProps) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const [hover, setHover] = useState(false);
  const phase = useRef(Math.random() * 10);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime * speed + phase.current;
    if (body.current) body.current.position.y = Math.sin(t * 2.2) * 0.02;
    if (head.current) {
      head.current.rotation.y = hover ? 0.35 : Math.sin(t * 0.7) * 0.25;
      head.current.rotation.x = pose === 'phone' ? 0.35 : Math.sin(t * 1.1) * 0.05;
    }
    if (armL.current && armR.current) {
      if (pose === 'type') {
        armL.current.rotation.x = -1.2 + Math.sin(t * 9) * 0.12;
        armR.current.rotation.x = -1.2 + Math.cos(t * 9 + 0.6) * 0.12;
      } else if (pose === 'phone') {
        armL.current.rotation.x = -2.1;
        armL.current.rotation.z = 0.35;
        armR.current.rotation.x = Math.sin(t * 1.5) * 0.15;
      } else {
        armL.current.rotation.x = Math.sin(t * 1.5) * 0.2;
        armR.current.rotation.x = hover ? -2.6 + Math.sin(t * 6) * 0.25 : -Math.sin(t * 1.5) * 0.2;
      }
    }
    if (root.current) {
      const target = hover ? 1.08 : 1;
      root.current.scale.setScalar(root.current.scale.x + (target - root.current.scale.x) * Math.min(1, dt * 10));
    }
  });

  const toneColor = tone === 'accent' ? pal.accent : tone === 'loss' ? pal.loss : tone === 'gain' ? pal.gain : pal.fg;

  return (
    <group
      ref={root}
      position={position}
      rotation={[0, rotation, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      {/* legs */}
      <Box p={[-0.14, 0.2, 0]} s={[0.22, 0.4, 0.26]} c={pal.dark ? '#2c2c33' : '#3a3a42'} />
      <Box p={[0.14, 0.2, 0]} s={[0.22, 0.4, 0.26]} c={pal.dark ? '#2c2c33' : '#3a3a42'} />
      <group ref={body}>
        {/* torso */}
        <Box p={[0, 0.66, 0]} s={[0.56, 0.52, 0.32]} c={color} />
        <Box p={[0, 0.66, 0.17]} s={[0.2, 0.3, 0.02]} c={pal.bg} />
        {/* arms */}
        <group ref={armL} position={[-0.36, 0.86, 0]}>
          <Box p={[0, -0.2, 0]} s={[0.16, 0.44, 0.18]} c={color} />
          <Box p={[0, -0.46, 0]} s={[0.16, 0.12, 0.18]} c={skin} />
          {pose === 'phone' && <Box p={[0.04, -0.58, 0.1]} s={[0.12, 0.2, 0.03]} c={pal.fg} />}
        </group>
        <group ref={armR} position={[0.36, 0.86, 0]}>
          <Box p={[0, -0.2, 0]} s={[0.16, 0.44, 0.18]} c={color} />
          <Box p={[0, -0.46, 0]} s={[0.16, 0.12, 0.18]} c={skin} />
        </group>
        {/* head */}
        <group ref={head} position={[0, 1.18, 0]}>
          <Box p={[0, 0, 0]} s={[0.46, 0.46, 0.44]} c={skin} />
          <Box p={[-0.1, 0.04, 0.23]} s={[0.07, 0.09, 0.02]} c={pal.fg} />
          <Box p={[0.1, 0.04, 0.23]} s={[0.07, 0.09, 0.02]} c={pal.fg} />
          <Box p={[0, -0.12, 0.23]} s={[0.14, 0.03, 0.02]} c={pal.dark ? '#5a3a30' : '#9a5a4a'} />
          {glasses && (
            <>
              <Box p={[-0.1, 0.04, 0.24]} s={[0.15, 0.14, 0.015]} c={pal.fg} />
              <Box p={[0.1, 0.04, 0.24]} s={[0.15, 0.14, 0.015]} c={pal.fg} />
              <Box p={[-0.1, 0.04, 0.245]} s={[0.1, 0.09, 0.01]} c={skin} />
              <Box p={[0.1, 0.04, 0.245]} s={[0.1, 0.09, 0.01]} c={skin} />
              <Box p={[0, 0.04, 0.24]} s={[0.06, 0.02, 0.015]} c={pal.fg} />
            </>
          )}
          {beard && <Box p={[0, -0.17, 0.2]} s={[0.36, 0.14, 0.1]} c="#3a2a1a" />}
          {/* hard hat */}
          <Box p={[0, 0.3, 0]} s={[0.52, 0.2, 0.5]} c={hat} />
          <Box p={[0, 0.42, 0]} s={[0.34, 0.1, 0.34]} c={hat} />
          <Box p={[0, 0.2, 0.08]} s={[0.6, 0.05, 0.64]} c={hat} />
        </group>
      </group>

      {/* label */}
      <Html position={[0, labelY, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div
          key={lineKey}
          className="hq-label"
          style={{ borderColor: hover ? pal.accent : pal.line, background: pal.dark ? 'rgba(20,20,22,0.92)' : 'rgba(255,255,255,0.94)', color: pal.fg, transform: `translate(${labelOffset[0]}px, ${labelOffset[1]}px)` }}
        >
          <div className="hq-label-title">
            <span style={{ color: pal.accent }}>{icon}</span> {title}
          </div>
          <div className="hq-label-line" style={{ color: toneColor }}>{line}</div>
        </div>
      </Html>
    </group>
  );
}
