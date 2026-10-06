'use client';

import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { Agent } from '@/components/hq/Agent';
import { Brick, Crane, Desk, Plate, Sign } from '@/components/hq/Props';
import { LIGHT as PAL, SKIN } from '@/components/hq/palette';

const yellow = { ...PAL, bg: '#FFC700', line: '#e6b300', fg: '#0a0a0a', dark: false };

/** Avatar: one big agent on a yellow brick plate. */
export function IconScene() {
  return (
    <Canvas orthographic dpr={2} shadows camera={{ position: [3, 2.2, 5], zoom: 150, near: -30, far: 60 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={1.0} />
      <directionalLight position={[4, 7, 5]} intensity={1.6} castShadow />
      <group position={[0, -1.15, 0]}>
        <Plate x={0} z={0} w={3} d={3} y={-0.3} color="#f0b800" studColor="#e0ac00" />
        <Agent position={[0, 0, 0]} rotation={-0.25} pal={yellow} color="#0a0a0a" skin={SKIN[0]} hat="#ffffff" pose="wave" title="" line="" lineKey="" icon="" labelY={99} />
        <ContactShadows position={[0, -0.29, 0]} opacity={0.35} scale={8} blur={2} far={4} />
      </group>
    </Canvas>
  );
}

/** Banner: the office with the sign, no labels. */
export function BannerScene() {
  const pal = PAL;
  const shirt = '#34343b';
  const np = { title: '', line: '', lineKey: '', icon: '', labelY: 99 };
  return (
    <Canvas orthographic dpr={2} shadows camera={{ position: [16, 13, 16], zoom: 36, near: -60, far: 120 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 14, 6]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-14, 14, 14, -14, 0.1, 50]} />
      </directionalLight>
      <group position={[-1.2, -2.0, 0.6]}>
        <Plate x={0} z={0} w={13} d={10} y={-0.3} color="#1c1c20" studColor={pal.line} />
        <Plate x={-2.5} z={-1} w={7} d={6} y={0} h={0.2} color="#232328" studColor={pal.line} />
        <mesh position={[0, 1.6, -5.1]} receiveShadow><boxGeometry args={[13, 3.2, 0.3]} /><meshStandardMaterial color="#26262b" roughness={0.9} /></mesh>
        <mesh position={[-6.6, 1.6, 0]} receiveShadow><boxGeometry args={[0.3, 3.2, 10]} /><meshStandardMaterial color="#26262b" roughness={0.9} /></mesh>
        <mesh position={[0, 3.3, -5.1]}><boxGeometry args={[13, 0.2, 0.34]} /><meshStandardMaterial color={pal.accent} /></mesh>
        <Sign text="CTO" position={[2.2, 3.45, -5.0]} color={pal.accent} pal={pal} unit={0.3} depth={0.5} />
        <Desk position={[-4.6, 0.2, -3.2]} pal={pal} screen="scan" screenColor={pal.loss} />
        <Agent position={[-4.6, 0.2, -2.3]} pal={pal} color={shirt} skin={SKIN[0]} hat={pal.loss} pose="type" {...np} />
        <Desk position={[-0.6, 0.2, -3.2]} pal={pal} screen="chart" screenColor={pal.accent} />
        <Agent position={[-0.6, 0.2, -2.3]} pal={pal} color={pal.accent} skin={SKIN[2]} hat={pal.accent} pose="type" {...np} />
        <Desk position={[3.6, 0.2, -3.2]} pal={pal} screen="x" screenColor={pal.fg} />
        <Agent position={[3.6, 0.2, -2.3]} pal={pal} color={shirt} skin={SKIN[4]} hat={pal.fg} pose="type" {...np} />
        <Agent position={[-3.8, 0.2, 1.8]} rotation={0.9} pal={pal} color={pal.gain} skin={SKIN[1]} hat={pal.gain} pose="phone" {...np} />
        <Desk position={[2.4, 0, 1.6]} rotation={Math.PI} pal={pal} screen="wallet" screenColor={pal.gain} />
        <Agent position={[2.4, 0, 0.7]} rotation={Math.PI} pal={pal} color={shirt} skin={SKIN[3]} hat={pal.accent} pose="type" {...np} />
        <Crane position={[-7.6, -0.3, -3.8]} pal={pal} />
        <Brick position={[-1.2, 0.18, 3.6]} color={pal.accent} rotation={0.3} />
        <Brick position={[0.2, 0.18, 4.1]} color={pal.loss} rotation={-0.5} />
        <Brick position={[-0.4, 0.53, 3.8]} color={pal.gain} rotation={0.1} />
        <ContactShadows position={[0, -0.29, 0]} opacity={0.5} scale={22} blur={2.2} far={6} />
      </group>
    </Canvas>
  );
}
