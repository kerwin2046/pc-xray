"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, Vector3, type Group } from "three";
import { PALETTE } from "./colors";
import { PartMaterial } from "./Part";
import { useScene } from "./SceneContext";

type Vec2 = [number, number];

export function Board({ size }: { size: [number, number, number] }) {
  const [w, h, d] = size;
  const traces = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: -w / 2 + 0.2 + ((i * 0.37) % (w - 0.4)),
        z: -d / 2 + 0.1 + ((i * 0.23) % (d - 0.2)),
        len: 0.25 + ((i * 0.13) % 0.4),
        rot: i % 2 ? 0 : Math.PI / 2,
      })),
    [w, d],
  );
  return (
    <group>
      <mesh>
        <boxGeometry args={size} />
        <PartMaterial color={PALETTE.pcb} roughness={0.7} />
      </mesh>
      {traces.map((t, i) => (
        <mesh key={i} position={[t.x, h / 2 + 0.001, t.z]} rotation={[0, t.rot, 0]}>
          <boxGeometry args={[t.len, 0.002, 0.008]} />
          <PartMaterial color={PALETTE.pcbTrace} glow={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function RamStick({ index }: { index: number }) {
  const { live } = useScene();
  const used = live ? live.memory.usedBytes / live.memory.totalBytes : 0.3;
  const temp = live?.moduleTemps[index] ?? null;
  const W = 0.95;
  const D = 0.3;
  return (
    <group>
      <mesh>
        <boxGeometry args={[W, 0.012, D]} />
        <PartMaterial color={PALETTE.pcb} heat={temp} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-W / 2 + 0.14 + i * 0.2, 0.011, -0.02]}>
          <boxGeometry args={[0.15, 0.01, 0.12]} />
          <PartMaterial color={PALETTE.chip} glowColor="#38bdf8" glow={0.05 + used * 0.7} heat={temp} />
        </mesh>
      ))}
      <mesh position={[0, 0.008, D / 2 - 0.025]}>
        <boxGeometry args={[W - 0.1, 0.004, 0.035]} />
        <PartMaterial color={PALETTE.gold} metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[W / 2 - 0.07, 0.009, -0.09]}>
        <boxGeometry args={[0.04, 0.006, 0.04]} />
        <PartMaterial color={PALETTE.chip} />
      </mesh>
    </group>
  );
}

export function Ssd() {
  const { live } = useScene();
  const temp = live?.ssdTemp ?? null;
  const W = 0.8;
  const D = 0.22;
  return (
    <group>
      <mesh>
        <boxGeometry args={[W, 0.01, D]} />
        <PartMaterial color={PALETTE.pcb} heat={temp} />
      </mesh>
      <mesh position={[-W / 2 + 0.03, 0.006, 0]}>
        <boxGeometry args={[0.04, 0.004, D - 0.04]} />
        <PartMaterial color={PALETTE.gold} metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[-W / 2 + 0.16, 0.011, 0]}>
        <boxGeometry args={[0.13, 0.012, 0.13]} />
        <PartMaterial color={PALETTE.chip} glowColor="#f59e0b" glow={0.25} heat={temp} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[-0.02 + i * 0.25, 0.011, 0]}>
          <boxGeometry args={[0.2, 0.012, 0.16]} />
          <PartMaterial color={PALETTE.chip} heat={temp} />
        </mesh>
      ))}
    </group>
  );
}

export function WifiCard() {
  const { live } = useScene();
  const temp = live?.wifiTemp ?? null;
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.3, 0.01, 0.22]} />
        <PartMaterial color={PALETTE.pcb} heat={temp} />
      </mesh>
      <mesh position={[0.02, 0.014, 0]}>
        <boxGeometry args={[0.2, 0.018, 0.16]} />
        <PartMaterial color={PALETTE.aluminum} metalness={0.8} roughness={0.3} heat={temp} />
      </mesh>
      {[-0.05, 0.05].map((z) => (
        <mesh key={z} position={[-0.11, 0.012, z]}>
          <cylinderGeometry args={[0.014, 0.014, 0.014, 16]} />
          <PartMaterial color={PALETTE.gold} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function Battery({ size }: { size: [number, number, number] }) {
  const { machine, live } = useScene();
  const [w, h, d] = size;
  const percent = live?.battery?.percent ?? machine.battery?.percent ?? 0;
  const fillColor = percent > 50 ? PALETTE.batteryFill : percent > 20 ? "#eab308" : "#ef4444";
  const cellW = (w - 0.08) / 3;
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-w / 2 + 0.04 + cellW / 2 + i * cellW, 0, 0]}>
          <boxGeometry args={[cellW - 0.02, h, d]} />
          <PartMaterial color={PALETTE.battery} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[-w / 2 + 0.06 + ((w - 0.12) * percent) / 200, h / 2 + 0.004, d / 2 - 0.08]}>
        <boxGeometry args={[((w - 0.12) * percent) / 100, 0.006, 0.06]} />
        <PartMaterial color={fillColor} glowColor={fillColor} glow={0.8} />
      </mesh>
    </group>
  );
}

interface CoolingProps {
  plate: { x: number; z: number; w: number; d: number; y: number };
  fan: Vec2;
  fanRadius: number;
  fins: { from: number; to: number; z: number };
}

export function Cooling({ plate, fan, fanRadius, fins }: CoolingProps) {
  const { live } = useScene();
  const blades = useRef<Group>(null);
  const cpuTemp = live?.cpu.packageTemp ?? null;
  const rpm = live?.fanRpm ?? 0;

  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.y -= (rpm / 1000) * 3 * dt;
  });

  const pipe = useMemo(() => {
    const finMid = (fins.from + fins.to) / 2;
    return new CatmullRomCurve3([
      new Vector3(plate.x, plate.y + 0.012, plate.z),
      new Vector3(plate.x - 0.35, plate.y + 0.02, plate.z - 0.12),
      new Vector3(fan[0] + fanRadius * 0.4, plate.y + 0.02, fins.z + 0.12),
      new Vector3(finMid, plate.y + 0.012, fins.z),
    ]);
  }, [plate, fan, fanRadius, fins]);

  const finCount = 14;
  const finStep = (fins.to - fins.from) / (finCount - 1);

  return (
    <group>
      <mesh position={[plate.x, plate.y, plate.z]}>
        <boxGeometry args={[plate.w, 0.012, plate.d]} />
        <PartMaterial color={PALETTE.copper} metalness={0.85} roughness={0.3} heat={cpuTemp} />
      </mesh>
      <mesh>
        <tubeGeometry args={[pipe, 48, 0.022, 10, false]} />
        <PartMaterial
          color={PALETTE.copper}
          metalness={0.85}
          roughness={0.3}
          heat={cpuTemp !== null ? cpuTemp - 8 : null}
        />
      </mesh>
      {Array.from({ length: finCount }, (_, i) => (
        <mesh key={i} position={[fins.from + i * finStep, plate.y, fins.z]}>
          <boxGeometry args={[0.008, 0.07, 0.14]} />
          <PartMaterial
            color={PALETTE.copper}
            metalness={0.7}
            roughness={0.35}
            heat={cpuTemp !== null ? cpuTemp - 20 : null}
          />
        </mesh>
      ))}
      <group position={[fan[0], plate.y - 0.01, fan[1]]}>
        <mesh>
          <cylinderGeometry args={[fanRadius, fanRadius, 0.075, 48, 1, true]} />
          <PartMaterial color="#475569" opacity={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[fanRadius, 48]} />
          <PartMaterial color="#1e293b" opacity={0.6} />
        </mesh>
        <group ref={blades}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 24]} />
            <PartMaterial color="#334155" metalness={0.4} />
          </mesh>
          {Array.from({ length: 11 }, (_, i) => {
            const a = (i / 11) * Math.PI * 2;
            const r = (0.07 + fanRadius) / 2;
            return (
              <mesh key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0.35, -a, 0]}>
                <boxGeometry args={[fanRadius - 0.1, 0.045, 0.012]} />
                <PartMaterial color="#64748b" glowColor="#38bdf8" glow={rpm > 0 ? 0.15 : 0} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}
