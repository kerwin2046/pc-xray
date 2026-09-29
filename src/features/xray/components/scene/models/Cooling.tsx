"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, ExtrudeGeometry, Path, Shape, Vector3, type Group } from "three";
import { PALETTE, REAL } from "../colors";
import { PartMaterial } from "../Part";
import { Scatter, useDispose, type Box, type Vec2 } from "../primitives";
import { useScene } from "../SceneContext";

interface CoolingProps {
  plate: { x: number; z: number; w: number; d: number; y: number };
  fan: Vec2;
  fanRadius: number;
  fins: { from: number; to: number; z: number };
}

function useFanSpin(rpm: number) {
  const blades = useRef<Group>(null);
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.y -= (rpm / 1000) * 3 * dt;
  });
  return blades;
}

function SchematicCooling({ plate, fan, fanRadius, fins }: CoolingProps) {
  const { live } = useScene();
  const cpuTemp = live?.cpu.packageTemp ?? null;
  const rpm = live?.fanRpm ?? 0;
  const blades = useFanSpin(rpm);

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

const FAN_H = 0.075;

/** Blower outline: a circle with a duct running toward -z (the fin stack). */
function blowerShape(radius: number, duct: number, hole?: number): Shape {
  const s = new Shape();
  s.moveTo(radius, 0);
  s.lineTo(radius, duct);
  s.lineTo(-radius, duct);
  s.lineTo(-radius, 0);
  s.absarc(0, 0, radius, Math.PI, Math.PI * 2, false);
  if (hole) {
    const h = new Path();
    h.absarc(0, 0, hole, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return s;
}

function RealisticCooling({ plate, fan, fanRadius: R, fins }: CoolingProps) {
  const { live } = useScene();
  const cpuTemp = live?.cpu.packageTemp ?? null;
  const rpm = live?.fanRpm ?? 0;
  const blades = useFanSpin(rpm);
  const duct = fan[1] - (fins.z + 0.07);
  const PIPE_SQUASH = 0.45;
  const finTop = plate.y + 0.035;

  const pipes = useMemo(
    () =>
      [-0.026, 0.026].map((o) => {
        const y = (v: number) => v / PIPE_SQUASH;
        return new CatmullRomCurve3([
          new Vector3(plate.x + 0.08, y(plate.y + 0.016), plate.z + o),
          new Vector3(plate.x - 0.12, y(plate.y + 0.018), plate.z + o),
          new Vector3(plate.x - 0.34, y(plate.y + 0.03), plate.z - 0.22 + o),
          new Vector3(fins.to + 0.1, y(finTop + 0.012), fins.z + o),
          new Vector3(fins.from + 0.04, y(finTop + 0.012), fins.z + o),
        ]);
      }),
    [plate, fins, finTop],
  );

  const finItems = useMemo(() => {
    const n = 44;
    const step = (fins.to - fins.from) / (n - 1);
    return Array.from({ length: n }, (_, i): Box => ({
      p: [fins.from + i * step, plate.y, fins.z],
      s: [0.0035, 0.07, 0.14],
    }));
  }, [fins, plate.y]);

  const bladeItems = useMemo(() => {
    const n = 37;
    return Array.from({ length: n }, (_, i): Box => {
      const a = (i / n) * Math.PI * 2;
      const r = R * 0.7;
      return { p: [Math.cos(a) * r, 0, Math.sin(a) * r], s: [R * 0.46, 0.05, 0.006], r: -a + 0.42 };
    });
  }, [R]);

  const [bottom, cover] = useMemo(() => {
    const opts = { depth: 0.004, bevelEnabled: false, curveSegments: 48 };
    return [
      new ExtrudeGeometry(blowerShape(R, duct), opts),
      new ExtrudeGeometry(blowerShape(R, duct, R * 0.72), opts),
    ];
  }, [R, duct]);
  useDispose(bottom);
  useDispose(cover);

  const arms = useMemo(
    () =>
      [0.6, Math.PI - 0.6, Math.PI + 0.6, -0.6].map((a) => ({
        a,
        len: 0.26,
        end: [plate.x + Math.cos(a) * 0.26, plate.z - Math.sin(a) * 0.26] as Vec2,
      })),
    [plate.x, plate.z],
  );

  return (
    <group>
      {/* copper cold plate + spring bracket */}
      <mesh position={[plate.x, plate.y, plate.z]}>
        <boxGeometry args={[plate.w, 0.012, plate.d]} />
        <PartMaterial color={REAL.copper} metalness={1} roughness={0.28} heat={cpuTemp} />
      </mesh>
      {arms.map(({ a, len, end }, i) => (
        <group key={i}>
          <mesh
            position={[plate.x + (Math.cos(a) * len) / 2, plate.y + 0.009, plate.z - (Math.sin(a) * len) / 2]}
            rotation={[0, a, 0]}
          >
            <boxGeometry args={[len, 0.004, 0.04]} />
            <PartMaterial color={REAL.steel} metalness={0.95} roughness={0.32} />
          </mesh>
          <mesh position={[end[0], plate.y + 0.013, end[1]]}>
            <cylinderGeometry args={[0.016, 0.016, 0.008, 20]} />
            <PartMaterial color={REAL.steel} metalness={0.95} roughness={0.25} />
          </mesh>
        </group>
      ))}

      <group scale={[1, PIPE_SQUASH, 1]}>
        {pipes.map((p, i) => (
          <mesh key={i}>
            <tubeGeometry args={[p, 64, 0.022, 12, false]} />
            <PartMaterial
              color={REAL.copper}
              metalness={1}
              roughness={0.3}
              heat={cpuTemp !== null ? cpuTemp - 8 : null}
            />
          </mesh>
        ))}
      </group>

      <Scatter
        items={finItems}
        color="#d39063"
        metalness={0.9}
        roughness={0.35}
        heat={cpuTemp !== null ? cpuTemp - 20 : null}
      />

      <group position={[fan[0], plate.y - 0.01, fan[1]]}>
        <mesh geometry={bottom} position={[0, -FAN_H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <PartMaterial color={REAL.plastic} roughness={0.6} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[R, R, FAN_H, 48, 1, true, -Math.PI / 2, Math.PI]} />
          <PartMaterial color={REAL.plastic} roughness={0.6} />
        </mesh>
        {[R, -R].map((x) => (
          <mesh key={x} position={[x, 0, -duct / 2]}>
            <boxGeometry args={[0.006, FAN_H, duct]} />
            <PartMaterial color={REAL.plastic} roughness={0.6} />
          </mesh>
        ))}
        <mesh geometry={cover} position={[0, FAN_H / 2 - 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <PartMaterial color={REAL.steel} metalness={0.9} roughness={0.38} />
        </mesh>
        <group ref={blades}>
          <mesh>
            <cylinderGeometry args={[R * 0.45, R * 0.45, 0.05, 40]} />
            <PartMaterial color="#1f2023" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.0255, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[R * 0.3, 40]} />
            <PartMaterial color="#c7c9cc" metalness={0.8} roughness={0.35} />
          </mesh>
          <Scatter items={bladeItems} color="#1a1b1e" roughness={0.5} />
        </group>
      </group>
    </group>
  );
}

export function Cooling(props: CoolingProps) {
  const { realistic } = useScene();
  return realistic ? <RealisticCooling {...props} /> : <SchematicCooling {...props} />;
}
