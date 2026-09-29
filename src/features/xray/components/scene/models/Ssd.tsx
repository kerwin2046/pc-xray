"use client";

import { useMemo } from "react";
import { formatDisk } from "@/lib/format";
import type { MachineInfo } from "@/types/hardware";
import { PALETTE, REAL } from "../colors";
import { PartMaterial } from "../Part";
import { Decal, fitLines, FONT, makeTexture, MONO, Scatter, useDispose, type Box } from "../primitives";
import { useScene } from "../SceneContext";

export const SSD_SIZE = { w: 0.8, d: 0.22 };

type Disk = MachineInfo["disks"][number];

function ssdSticker(disk: Disk) {
  return makeTexture(700, 240, (ctx, W, H) => {
    ctx.fillStyle = "#101114";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e11d48";
    ctx.fillRect(0, 0, 10, H);
    const [brand, ...rest] = disk.name.split(/\s+/);
    ctx.fillStyle = "#f5f5f4";
    ctx.font = `800 46px ${FONT}`;
    ctx.fillText(brand ?? "SSD", 34, 64);
    ctx.font = `500 26px ${MONO}`;
    fitLines(ctx, rest.join(" ") || disk.type, W - 70, 2).forEach((l, i) => ctx.fillText(l, 34, 108 + i * 32));
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(`${formatDisk(disk.sizeBytes)}  ${disk.type} ${disk.interface}`, 34, H - 34);
    ctx.fillStyle = "#71717a";
    ctx.font = `400 20px ${MONO}`;
    ctx.textAlign = "right";
    ctx.fillText(`FW ${disk.firmware}`, W - 24, H - 36);
  });
}

function SsdDetail({ disk, temp, top }: { disk: Disk; temp: number | null; top: number }) {
  const { w, d } = SSD_SIZE;
  const tex = useMemo(() => ssdSticker(disk), [disk]);
  useDispose(tex);
  const fingers = useMemo(() => {
    const out: Box[] = [];
    const notch = 0.055;
    for (let z = -d / 2 + 0.02; z < d / 2 - 0.02; z += 0.008) {
      if (Math.abs(z - notch) < 0.01) continue;
      out.push({ p: [-w / 2 + 0.02, top + 0.001, z], s: [0.034, 0.002, 0.005] });
    }
    return out;
  }, [w, d, top]);
  return (
    <group>
      <Scatter items={fingers} color={REAL.gold} metalness={1} roughness={0.22} />
      <mesh position={[w / 2 - 0.014, top + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.009, 0.02, 24, 1, Math.PI / 2, Math.PI]} />
        <PartMaterial color={REAL.gold} metalness={1} roughness={0.25} />
      </mesh>
      <Decal
        position={[0.03, top + 0.0137, 0]}
        size={[0.6, 0.2]}
        map={tex}
        heat={temp}
        roughness={0.35}
        clearcoat={0.4}
      />
    </group>
  );
}

export function Ssd({ disk }: { disk: Disk }) {
  const { live, realistic } = useScene();
  const temp = live?.ssdTemp ?? null;
  const { w, d } = SSD_SIZE;
  const H = 0.01;
  const top = H / 2;
  const chip = realistic ? REAL.chip : PALETTE.chip;
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, H, d]} />
        <PartMaterial color={realistic ? REAL.pcb : PALETTE.pcb} heat={temp} roughness={0.45} clearcoat={0.6} />
      </mesh>
      <mesh position={[-w / 2 + 0.16, top + 0.006, 0]}>
        <boxGeometry args={[0.13, 0.012, 0.13]} />
        <PartMaterial
          color={chip}
          glowColor={realistic ? undefined : "#f59e0b"}
          glow={realistic ? 0 : 0.25}
          heat={temp}
        />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[-0.02 + i * 0.25, top + 0.006, 0]}>
          <boxGeometry args={[0.2, 0.012, 0.16]} />
          <PartMaterial color={chip} heat={temp} />
        </mesh>
      ))}
      {realistic ? (
        <SsdDetail disk={disk} temp={temp} top={top} />
      ) : (
        <mesh position={[-w / 2 + 0.03, top + 0.001, 0]}>
          <boxGeometry args={[0.04, 0.004, d - 0.04]} />
          <PartMaterial color={PALETTE.gold} metalness={0.9} roughness={0.25} />
        </mesh>
      )}
    </group>
  );
}
