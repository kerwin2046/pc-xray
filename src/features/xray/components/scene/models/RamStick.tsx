"use client";

import { useMemo } from "react";
import { formatMem } from "@/lib/format";
import type { MemoryModule } from "@/types/hardware";
import { PALETTE, REAL } from "../colors";
import { PartMaterial } from "../Part";
import { Decal, FONT, makeTexture, MONO, rng, Scatter, useDispose, type Box, type Rect } from "../primitives";
import { useScene } from "../SceneContext";

export const RAM_SIZE = { w: 0.7, d: 0.3 };

function dramChipCount(m: MemoryModule): number {
  if (m.sizeBytes && m.dieDensityGb) {
    const n = Math.round(m.sizeBytes / (m.dieDensityGb * 2 ** 27));
    if (n >= 4 && n <= 32) return n;
  }
  return 8;
}

function memorySticker(m: MemoryModule, chips: number) {
  const gen = /DDR(\d)/.exec(m.type)?.[1];
  return makeTexture(640, 132, (ctx, W, H) => {
    ctx.fillStyle = "#f4f3ef";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111";
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(`${m.sizeBytes ? formatMem(m.sizeBytes) : "?"} ${m.type} ${m.formFactor}`, 16, 44);
    ctx.font = `500 24px ${MONO}`;
    if (gen && m.speedMTs) ctx.fillText(`PC${gen}-${m.speedMTs * 8}  ${m.speedMTs} MT/s`, 16, 80);
    if (m.dieDensityGb) ctx.fillText(`${chips}× ${m.dieDensityGb}Gb x${m.ioWidth ?? "?"}`, 16, 112);
    const r = rng(m.slot.length * 31 + chips);
    for (let x = W - 190; x < W - 16; x += 2 + Math.floor(r() * 3)) {
      ctx.fillRect(x, 24, 1 + Math.floor(r() * 3), H - 48);
    }
  });
}

function dramMarking(m: MemoryModule) {
  return makeTexture(256, 200, (ctx, W, H) => {
    ctx.fillStyle = REAL.chip;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(200, 200, 205, 0.55)";
    ctx.beginPath();
    ctx.arc(22, 22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `600 34px ${MONO}`;
    ctx.fillText(`${m.type}`, 28, 86);
    ctx.font = `500 26px ${MONO}`;
    ctx.fillText(`${m.dieDensityGb ?? "?"}Gb x${m.ioWidth ?? "?"}`, 28, 126);
    ctx.fillText(`${m.speedMTs ?? ""}`, 28, 162);
  });
}

interface MemoryDetailProps {
  module: MemoryModule;
  chips: number;
  top: number;
  temp: number | null;
  chipRects: Rect[];
}

function MemoryDetail({ module, chips, top, temp, chipRects }: MemoryDetailProps) {
  const { w, d } = RAM_SIZE;
  const tex = useMemo(() => memorySticker(module, chips), [module, chips]);
  useDispose(tex);
  const marking = useMemo(() => dramMarking(module), [module]);
  useDispose(marking);
  const fingers = useMemo(() => {
    const out: Box[] = [];
    const notch = -0.05;
    for (let x = -w / 2 + 0.03; x < w / 2 - 0.03; x += 0.0085) {
      if (Math.abs(x - notch) < 0.012) continue;
      out.push({ p: [x, top + 0.001, d / 2 - 0.022], s: [0.0055, 0.002, 0.036] });
    }
    return out;
  }, [w, d, top]);
  const smd = useMemo(() => {
    const r = rng(chips * 13 + 5);
    return Array.from({ length: 36 }, (): Box => ({
      p: [(r() - 0.5) * (w - 0.08), top + 0.003, 0.01 + r() * 0.08],
      s: [0.012, 0.006, 0.007],
      r: r() < 0.5 ? 0 : Math.PI / 2,
    })).filter((b) => b.p[0] > 0.14 || b.p[0] < -0.24);
  }, [chips, w, top]);
  return (
    <group>
      <Scatter items={fingers} color={REAL.gold} metalness={1} roughness={0.22} />
      <Scatter items={smd} color={REAL.mlcc} roughness={0.5} />
      <Decal position={[-0.05, top + 0.0008, 0.06]} size={[0.34, 0.07]} map={tex} heat={temp} roughness={0.5} />
      {chipRects.map((r, i) => (
        <Decal
          key={i}
          position={[r.x, top + 0.0106, r.z]}
          size={[r.w * 0.96, r.d * 0.96]}
          map={marking}
          heat={temp}
          roughness={0.55}
        />
      ))}
    </group>
  );
}

export function RamStick({ index, module }: { index: number; module: MemoryModule }) {
  const { live, realistic } = useScene();
  const used = live ? live.memory.usedBytes / live.memory.totalBytes : 0.3;
  const temp = live?.moduleTemps[index] ?? null;
  const { w, d } = RAM_SIZE;
  const H = 0.012;
  const top = H / 2;
  const chips = dramChipCount(module);
  const perSide = Math.ceil(chips / 2);
  const rows = perSide > 4 ? 2 : 1;
  const cols = Math.ceil(perSide / rows);
  const pitch = (w - 0.12) / cols;
  const chipW = Math.min(0.11, pitch - 0.02);
  const chipD = rows === 2 ? 0.07 : 0.085;
  const rowZ = rows === 2 ? [-0.09, -0.012] : [-0.05];
  const chipRects = rowZ.flatMap((z) =>
    Array.from({ length: cols }, (_, c): Rect => ({ x: -w / 2 + 0.06 + pitch * (c + 0.5), z, w: chipW, d: chipD })),
  );

  return (
    <group>
      <mesh>
        <boxGeometry args={[w, H, d]} />
        <PartMaterial
          color={realistic ? REAL.pcb : PALETTE.pcb}
          heat={temp}
          roughness={realistic ? 0.45 : 0.6}
          clearcoat={0.6}
        />
      </mesh>
      {chipRects.map((r, i) => (
        <mesh key={i} position={[r.x, top + 0.005, r.z]}>
          <boxGeometry args={[r.w, 0.01, r.d]} />
          <PartMaterial
            color={realistic ? REAL.chip : PALETTE.chip}
            glowColor={realistic ? undefined : "#38bdf8"}
            glow={realistic ? 0 : 0.05 + used * 0.7}
            heat={temp}
            roughness={realistic ? 0.55 : 0.6}
          />
        </mesh>
      ))}
      {/* PMIC and SPD hub */}
      <mesh position={[w / 2 - 0.075, top + 0.004, 0.065]}>
        <boxGeometry args={[0.045, 0.008, 0.045]} />
        <PartMaterial color={realistic ? REAL.chip : PALETTE.chip} roughness={0.5} />
      </mesh>
      <mesh position={[-w / 2 + 0.065, top + 0.003, 0.07]}>
        <boxGeometry args={[0.025, 0.006, 0.025]} />
        <PartMaterial color={realistic ? REAL.chip : PALETTE.chip} roughness={0.5} />
      </mesh>
      {realistic ? (
        <MemoryDetail module={module} chips={chips} top={top} temp={temp} chipRects={chipRects} />
      ) : (
        <mesh position={[0, top + 0.002, d / 2 - 0.022]}>
          <boxGeometry args={[w - 0.06, 0.004, 0.036]} />
          <PartMaterial color={PALETTE.gold} metalness={0.9} roughness={0.25} />
        </mesh>
      )}
    </group>
  );
}
