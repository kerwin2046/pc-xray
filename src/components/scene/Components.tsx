"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, ExtrudeGeometry, Path, Shape, Vector3, type Group } from "three";
import type { MachineInfo, MemoryModule } from "@/lib/types";
import { formatDisk, formatMem } from "@/lib/format";
import { uiText } from "@/lib/i18n/ui";
import { PALETTE, REAL } from "./colors";
import { Decal, FONT, fitLines, inRects, makeTexture, MONO, rng, Scatter, useDispose, type Box, type Rect } from "./detail";
import { PartMaterial } from "./Part";
import { useScene } from "./SceneContext";

type Vec2 = [number, number];
type Vec3 = [number, number, number];

export const RAM_SIZE = { w: 0.7, d: 0.3 };
export const SSD_SIZE = { w: 0.8, d: 0.22 };
export const WIFI_SIZE = { w: 0.3, d: 0.22 };

// ───────────────────────────── Motherboard ─────────────────────────────

/** Board-local positions of things soldered to the motherboard. */
export interface BoardFixtures {
  /** Areas covered by other parts; the first entry is the CPU. */
  keepOut: Rect[];
  dimmSockets: Rect[];
  m2Sockets: Rect[];
  standoffs: Vec2[];
  chokes: Rect;
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  size: { w: number; d: number },
  fixtures: BoardFixtures,
  name: string,
) {
  const sx = W / size.w;
  const sz = H / size.d;
  const px = (x: number) => (x + size.w / 2) * sx;
  const pz = (z: number) => (z + size.d / 2) * sz;
  const r = rng(7);

  ctx.fillStyle = REAL.pcb;
  ctx.fillRect(0, 0, W, H);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 320; i++) {
    let x = r() * W;
    let y = r() * H;
    ctx.strokeStyle = `rgba(52, 128, 92, ${0.18 + r() * 0.3})`;
    ctx.lineWidth = 1 + r() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let dir = Math.floor(r() * 4) * 2;
    for (let s = 0, n = 2 + Math.floor(r() * 4); s < n; s++) {
      dir = (dir + (r() < 0.5 ? 1 : 7)) % 8;
      const len = 20 + r() * 160;
      x += Math.cos((dir * Math.PI) / 4) * len;
      y += Math.sin((dir * Math.PI) / 4) * len;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(205, 170, 95, 0.85)";
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(235, 235, 225, 0.75)";
  ctx.fillStyle = "rgba(235, 235, 225, 0.8)";
  ctx.lineWidth = 2;
  ctx.font = `600 18px ${MONO}`;
  const refs = ["U1", "J2", "J3", "J5", "U7", "J9", "U12", "PU3"];
  fixtures.keepOut.forEach((k, i) => {
    ctx.strokeRect(px(k.x - k.w / 2), pz(k.z - k.d / 2), k.w * sx, k.d * sz);
    ctx.fillText(refs[i % refs.length], px(k.x - k.w / 2) + 4, pz(k.z + k.d / 2) + 20);
  });
  for (const [x, z] of fixtures.standoffs) {
    ctx.beginPath();
    ctx.arc(px(x), pz(z), 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.font = `700 30px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(name, W - 40, H - 70);
  ctx.font = `500 20px ${MONO}`;
  ctx.fillText("REV 1.0   94V-0   ⚠ ESD", W - 40, H - 40);
}

function useBoardSmd(size: Vec3, fixtures: BoardFixtures) {
  return useMemo(() => {
    const [w, h, d] = size;
    const top = h / 2;
    const r = rng(42);
    const mlcc: Box[] = [];
    const res: Box[] = [];
    const tant: Box[] = [];
    const place = (x: number, z: number) => {
      if (Math.abs(x) > w / 2 - 0.03 || Math.abs(z) > d / 2 - 0.03) return;
      if (inRects(x, z, fixtures.keepOut, 0.012) || inRects(x, z, [fixtures.chokes], 0.01)) return;
      const k = r();
      const rot = r() < 0.5 ? 0 : Math.PI / 2;
      if (k < 0.68) mlcc.push({ p: [x, top + 0.0035, z], s: [0.016, 0.007, 0.009], r: rot });
      else if (k < 0.92) res.push({ p: [x, top + 0.003, z], s: [0.014, 0.006, 0.008], r: rot });
      else tant.push({ p: [x, top + 0.007, z], s: [0.03, 0.014, 0.02], r: rot });
    };
    for (let i = 0; i < 360; i++) place((r() - 0.5) * w, (r() - 0.5) * d);
    const cpu = fixtures.keepOut[0];
    if (cpu) {
      for (let i = 0; i < 180; i++) {
        place(cpu.x + (r() - 0.5) * (cpu.w + 0.18), cpu.z + (r() - 0.5) * (cpu.d + 0.18));
      }
    }
    return { mlcc, res, tant };
  }, [size, fixtures]);
}

function BoardDetail({ size, fixtures, name }: { size: Vec3; fixtures: BoardFixtures; name: string }) {
  const [w, h, d] = size;
  const tex = useMemo(
    () => makeTexture(2048, 1024, (ctx, W, H) => drawBoard(ctx, W, H, { w, d }, fixtures, name)),
    [w, d, fixtures, name],
  );
  useDispose(tex);
  const smd = useBoardSmd(size, fixtures);
  return (
    <group>
      <Decal position={[0, h / 2 + 0.0006, 0]} size={[w, d]} map={tex} roughness={0.45} clearcoat={0.6} />
      <Scatter items={smd.mlcc} color={REAL.mlcc} roughness={0.5} />
      <Scatter items={smd.res} color={REAL.resistor} roughness={0.6} />
      <Scatter items={smd.tant} color="#c0922f" roughness={0.45} />
    </group>
  );
}

export function Board({ size, fixtures, name }: { size: Vec3; fixtures: BoardFixtures; name: string }) {
  const { realistic } = useScene();
  const [w, h, d] = size;
  const top = h / 2;
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
  const chokes = useMemo(() => {
    const c = fixtures.chokes;
    const n = Math.max(1, Math.floor(c.w / 0.08));
    const step = c.w / n;
    return Array.from({ length: n }, (_, i): Box => ({
      p: [c.x - c.w / 2 + step * (i + 0.5), top + 0.0175, c.z],
      s: [0.055, 0.035, 0.055],
    }));
  }, [fixtures.chokes, top]);

  return (
    <group>
      <mesh>
        <boxGeometry args={size} />
        <PartMaterial
          color={realistic ? REAL.pcb : PALETTE.pcb}
          roughness={realistic ? 0.45 : 0.7}
          clearcoat={0.6}
        />
      </mesh>
      {realistic ? (
        <BoardDetail size={size} fixtures={fixtures} name={name} />
      ) : (
        traces.map((t, i) => (
          <mesh key={i} position={[t.x, top + 0.001, t.z]} rotation={[0, t.rot, 0]}>
            <boxGeometry args={[t.len, 0.002, 0.008]} />
            <PartMaterial color={PALETTE.pcbTrace} glow={0.2} />
          </mesh>
        ))
      )}
      {fixtures.dimmSockets.map((s, i) => (
        <mesh key={`dimm-${i}`} position={[s.x, top + 0.011, s.z]}>
          <boxGeometry args={[s.w, 0.022, s.d]} />
          <PartMaterial color={REAL.socket} roughness={0.55} />
        </mesh>
      ))}
      {fixtures.m2Sockets.map((s, i) => (
        <mesh key={`m2-${i}`} position={[s.x, top + 0.009, s.z]}>
          <boxGeometry args={[s.w, 0.018, s.d]} />
          <PartMaterial color={REAL.socket} roughness={0.55} />
        </mesh>
      ))}
      <Scatter items={chokes} color={REAL.choke} metalness={0.55} roughness={0.45} />
      {fixtures.standoffs.map(([x, z], i) => (
        <group key={`so-${i}`} position={[x, top, z]}>
          <mesh position={[0, 0.006, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.012, 20]} />
            <PartMaterial color={REAL.gold} metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.014, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.005, 16]} />
            <PartMaterial color={REAL.steel} metalness={0.95} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* battery connector */}
      <mesh position={[0, top + 0.008, d / 2 - 0.035]}>
        <boxGeometry args={[0.1, 0.016, 0.04]} />
        <PartMaterial color={REAL.connector} roughness={0.6} />
      </mesh>
    </group>
  );
}

// ───────────────────────────── Memory ─────────────────────────────

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

interface MemoryDetailProps {
  module: MemoryModule;
  chips: number;
  top: number;
  temp: number | null;
  chipRects: Rect[];
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

// ───────────────────────────── SSD ─────────────────────────────

function ssdSticker(disk: MachineInfo["disks"][number]) {
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

function SsdDetail({ disk, temp, top }: { disk: MachineInfo["disks"][number]; temp: number | null; top: number }) {
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
      <Decal position={[0.03, top + 0.0137, 0]} size={[0.6, 0.2]} map={tex} heat={temp} roughness={0.35} clearcoat={0.4} />
    </group>
  );
}

export function Ssd({ disk }: { disk: MachineInfo["disks"][number] }) {
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

// ───────────────────────────── Wi-Fi ─────────────────────────────

function WifiDetail({ wifi, temp, top }: { wifi: MachineInfo["network"]["wifi"][number] | undefined; temp: number | null; top: number }) {
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

// ───────────────────────────── Battery ─────────────────────────────

function batterySticker(battery: NonNullable<MachineInfo["battery"]>, percent: number, warning: string) {
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
  battery: NonNullable<MachineInfo["battery"]>;
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

export function Battery({ size }: { size: [number, number, number] }) {
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

// ───────────────────────────── Cooling ─────────────────────────────

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
