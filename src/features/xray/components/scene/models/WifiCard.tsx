"use client";

import { useMemo } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
import type { MachineInfo } from "@/types/hardware";
import { PALETTE, REAL } from "../colors";
import { PartMaterial } from "../Part";
import { Decal, fitLines, FONT, makeTexture, MONO, useDispose } from "../primitives";
import { useScene } from "../SceneContext";

export const WIFI_SIZE = { w: 0.3, d: 0.22 };

type WifiAdapter = MachineInfo["network"]["wifi"][number];

function WifiDetail({ wifi, temp, top }: { wifi: WifiAdapter | undefined; temp: number | null; top: number }) {
  const { w, d } = WIFI_SIZE;
  const tex = useMemo(
    () =>
      makeTexture(420, 380, (ctx, W, H) => {
        ctx.fillStyle = "#e7e5e0";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#1f2937";
        ctx.font = `800 52px ${FONT}`;
        ctx.fillText((wifi?.vendor ?? "Wi-Fi").replace(/\s+(Corporation|Corp\.?|Inc\.?)$/i, ""), 26, 76);
        ctx.font = `500 30px ${FONT}`;
        fitLines(ctx, wifi?.model ?? "Wireless LAN", W - 52, 3).forEach((l, i) => ctx.fillText(l, 26, 134 + i * 40));
        ctx.font = `400 22px ${MONO}`;
        ctx.fillText("M.2 2230 · Wi-Fi + BT", 26, H - 70);
        ctx.fillText("MAIN ▲   AUX △", 26, H - 34);
      }),
    [wifi],
  );
  useDispose(tex);
  const cables = useMemo(
    () =>
      [-0.05, 0.05].map(
        (z, i) =>
          new CatmullRomCurve3([
            new Vector3(-0.115, top + 0.016, z),
            new Vector3(-0.2, top + 0.02, z * 0.4 - 0.1),
            new Vector3(-0.28 - i * 0.02, top + 0.012, -0.45),
            new Vector3(-0.3 - i * 0.02, top + 0.012, -0.98),
          ]),
      ),
    [top],
  );
  return (
    <group>
      <Decal position={[-0.01, top + 0.0215, 0]} size={[0.15, 0.14]} map={tex} heat={temp} roughness={0.5} />
      <mesh position={[w / 2 - 0.018, top + 0.001, 0]}>
        <boxGeometry args={[0.03, 0.002, d - 0.04]} />
        <PartMaterial color={REAL.gold} metalness={1} roughness={0.22} />
      </mesh>
      {cables.map((c, i) => (
        <mesh key={i}>
          <tubeGeometry args={[c, 40, 0.0045, 6, false]} />
          <PartMaterial color={i === 0 ? "#18181b" : "#a1a1aa"} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function WifiCard() {
  const { live, machine, realistic } = useScene();
  const temp = live?.wifiTemp ?? null;
  const { w, d } = WIFI_SIZE;
  const H = 0.01;
  const top = H / 2;
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, H, d]} />
        <PartMaterial color={realistic ? REAL.pcb : PALETTE.pcb} heat={temp} roughness={0.45} clearcoat={0.6} />
      </mesh>
      <mesh position={[-0.01, top + 0.01, 0]}>
        <boxGeometry args={[0.17, 0.02, 0.16]} />
        <PartMaterial
          color={realistic ? REAL.steel : PALETTE.aluminum}
          metalness={0.85}
          roughness={realistic ? 0.38 : 0.3}
          heat={temp}
        />
      </mesh>
      {[-0.05, 0.05].map((z) => (
        <mesh key={z} position={[-0.115, top + 0.006, z]}>
          <cylinderGeometry args={[0.012, 0.012, 0.012, 16]} />
          <PartMaterial color={realistic ? REAL.gold : PALETTE.gold} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {realistic && <WifiDetail wifi={machine.network.wifi[0]} temp={temp} top={top} />}
    </group>
  );
}
