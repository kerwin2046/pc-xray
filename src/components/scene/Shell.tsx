"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { MathUtils, type Group } from "three";
import { PALETTE } from "./colors";
import { GhostMaterial, PartMaterial } from "./Part";
import { useScene } from "./SceneContext";

export function Chassis({ w, h, d }: { w: number; h: number; d: number }) {
  return (
    <group>
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[w, 0.01, d]} />
        <meshStandardMaterial color="#0b1220" transparent opacity={0.85} roughness={0.9} />
        <Edges color={PALETTE.edge} threshold={15} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <GhostMaterial opacity={0.035} />
        <Edges color={PALETTE.edge} threshold={15} />
      </mesh>
    </group>
  );
}

export function Deck({ w, d }: { w: number; d: number }) {
  const keys = useMemo(() => {
    const out: { x: number; z: number; w: number }[] = [];
    const rows = 6;
    const cols = 14;
    const keyW = 0.14;
    const gap = 0.025;
    const startX = -((cols * keyW + (cols - 1) * gap) / 2);
    for (let r = 0; r < rows; r++) {
      const z = -0.72 + r * (keyW + gap) * (r === 0 ? 0.8 : 1);
      if (r === rows - 1) {
        out.push({ x: -0.95, z, w: keyW * 2 });
        out.push({ x: 0, z, w: keyW * 6 });
        out.push({ x: 0.95, z, w: keyW * 2 });
        continue;
      }
      for (let c = 0; c < cols; c++) {
        out.push({ x: startX + c * (keyW + gap) + keyW / 2, z, w: keyW });
      }
    }
    return out;
  }, []);

  return (
    <group>
      <mesh>
        <boxGeometry args={[w, 0.012, d]} />
        <GhostMaterial opacity={0.05} />
        <Edges color={PALETTE.edge} threshold={15} />
      </mesh>
      {keys.map((k, i) => (
        <mesh key={i} position={[k.x, 0.012, k.z]}>
          <boxGeometry args={[k.w, 0.012, 0.13]} />
          <PartMaterial color="#94a3b8" opacity={0.18} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.008, d / 2 - 0.42]}>
        <boxGeometry args={[0.95, 0.004, 0.5]} />
        <PartMaterial color="#94a3b8" opacity={0.14} />
      </mesh>
    </group>
  );
}

export function Lid({ w, h }: { w: number; h: number }) {
  const { exploded } = useScene();
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.x = MathUtils.damp(ref.current.rotation.x, exploded ? -0.12 : -0.3, 4, dt);
  });
  return (
    <group ref={ref} rotation={[-0.3, 0, 0]}>
      <mesh position={[0, h / 2, -0.01]}>
        <boxGeometry args={[w, h, 0.02]} />
        <GhostMaterial opacity={0.08} />
        <Edges color={PALETTE.edge} threshold={15} />
      </mesh>
      <mesh position={[0, h / 2 + 0.03, 0.002]}>
        <planeGeometry args={[w - 0.14, h - 0.2]} />
        <PartMaterial color="#0b1220" glowColor="#1d4ed8" glow={0.35} opacity={0.75} roughness={0.2} />
      </mesh>
      <mesh position={[0, h - 0.045, 0.004]}>
        <circleGeometry args={[0.012, 16]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
    </group>
  );
}
