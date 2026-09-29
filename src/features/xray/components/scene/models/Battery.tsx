"use client";

import { useMemo } from "react";
import { uiText } from "@/i18n/ui";
import type { MachineInfo } from "@/types/hardware";
import { PALETTE, REAL } from "../colors";
import { PartMaterial } from "../Part";
import { Decal, FONT, makeTexture, MONO, useDispose, type Vec3 } from "../primitives";
import { useScene } from "../SceneContext";

type BatteryInfo = NonNullable<MachineInfo["battery"]>;

function batterySticker(battery: BatteryInfo, percent: number, warning: string) {
  const capacity =
    battery.capacityUnit === "mWh"
      ? `${(battery.designedCapacity / 1000).toFixed(1)} Wh`
      : `${battery.designedCapacity} ${battery.capacityUnit}`;
  return makeTexture(900, 420, (ctx, W, H) => {
    ctx.fillStyle = "#ecebe6";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111";
    ctx.font = `800 50px ${FONT}`;
    ctx.fillText(battery.chemistry.toLowerCase().includes("poly") ? "Li-Polymer Battery" : "Li-ion Battery", 36, 78);
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText(`${battery.manufacturer} ${battery.model}`.trim(), 36, 134);
    ctx.font = `600 36px ${MONO}`;
    ctx.fillText(`${capacity}  ·  ${battery.cycleCount} cycles`, 36, 190);
    const barX = 36;
    const barY = 236;
    const barW = W - 72;
    const barH = 56;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#111";
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = percent > 50 ? "#16a34a" : percent > 20 ? "#ca8a04" : "#dc2626";
    ctx.fillRect(barX + 6, barY + 6, ((barW - 12) * percent) / 100, barH - 12);
    ctx.fillStyle = "#111";
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(`${Math.round(percent)}%`, barX, barY + barH + 50);
    ctx.font = `400 22px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(warning, W - 36, H - 30);
  });
}

interface BatteryDetailProps {
  battery: BatteryInfo;
  size: Vec3;
  percent: number;
}

function BatteryDetail({ battery, size, percent }: BatteryDetailProps) {
  const [, h, d] = size;
  const rounded = Math.round(percent);
  const warning = uiText(useScene().locale).scene.batteryWarning;
  const tex = useMemo(() => batterySticker(battery, rounded, warning), [battery, rounded, warning]);
  useDispose(tex);
  return (
    <group>
      <Decal position={[0.15, h / 2 + 0.0035, 0.02]} size={[0.9, 0.42]} map={tex} roughness={0.55} />
      {/* flex cable to the board connector */}
      <mesh position={[0, h / 2 - 0.004, -d / 2 - 0.07]}>
        <boxGeometry args={[0.08, 0.004, 0.16]} />
        <PartMaterial color="#1c1c1f" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function Battery({ size }: { size: Vec3 }) {
  const { machine, live, realistic } = useScene();
  const [w, h, d] = size;
  const percent = live?.battery?.percent ?? machine.battery?.percent ?? 0;
  const fillColor = percent > 50 ? PALETTE.batteryFill : percent > 20 ? "#eab308" : "#ef4444";
  const cellW = (w - 0.08) / 3;
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-w / 2 + 0.04 + cellW / 2 + i * cellW, 0, 0]}>
          <boxGeometry args={[cellW - 0.02, h, d]} />
          <PartMaterial color={realistic ? REAL.plastic : PALETTE.battery} roughness={realistic ? 0.7 : 0.5} />
        </mesh>
      ))}
      {realistic ? (
        <>
          <mesh position={[0, h / 2 + 0.0015, 0]}>
            <boxGeometry args={[w - 0.06, 0.003, d - 0.02]} />
            <PartMaterial color="#121316" roughness={0.75} />
          </mesh>
          {machine.battery && <BatteryDetail battery={machine.battery} size={size} percent={percent} />}
        </>
      ) : (
        <mesh position={[-w / 2 + 0.06 + ((w - 0.12) * percent) / 200, h / 2 + 0.004, d / 2 - 0.08]}>
          <boxGeometry args={[((w - 0.12) * percent) / 100, 0.006, 0.06]} />
          <PartMaterial color={fillColor} glowColor={fillColor} glow={0.8} />
        </mesh>
      )}
    </group>
  );
}
