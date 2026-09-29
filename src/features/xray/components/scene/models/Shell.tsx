"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { MathUtils, type Group } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { MachineInfo } from "@/lib/types";
import { gpuName } from "@/lib/parts";
import { formatDisk, formatMem } from "@/lib/format";
import { PALETTE, REAL } from "./colors";
import { Decal, FONT, makeTexture, MONO, Scatter, useDispose, type Box } from "./detail";
import { GhostMaterial, PartMaterial } from "./Part";
import { useScene } from "./SceneContext";

// ───────────────────────────── Chassis ─────────────────────────────

function SchematicChassis({ w, h, d }: { w: number; h: number; d: number }) {
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

interface Port {
  side: -1 | 1;
  z: number;
  height: number;
  length: number;
}

const PORTS: Port[] = [
  { side: -1, z: -0.62, height: 0.028, length: 0.085 },
  { side: -1, z: -0.48, height: 0.028, length: 0.085 },
  { side: -1, z: -0.25, height: 0.05, length: 0.14 },
  { side: -1, z: 0.02, height: 0.045, length: 0.12 },
  { side: 1, z: -0.45, height: 0.045, length: 0.12 },
];

function RealisticChassis({ w, h, d }: { w: number; h: number; d: number }) {
  const t = 0.025;
  const vents = useMemo(() => {
    const out: Box[] = [];
    for (let x = -1.45; x <= -0.95; x += 0.036) out.push({ p: [x, h * 0.55, -d / 2], s: [0.02, h * 0.45, t + 0.004] });
    return out;
  }, [h, d]);
  const metal = { color: REAL.chassis, metalness: 0.85, roughness: 0.42 };
  return (
    <group>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[w, 0.02, d]} />
        <PartMaterial {...metal} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`z${s}`} position={[0, h / 2, (s * (d - t)) / 2]}>
          <boxGeometry args={[w, h, t]} />
          <PartMaterial {...metal} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`x${s}`} position={[(s * (w - t)) / 2, h / 2, 0]}>
          <boxGeometry args={[t, h, d - t * 2]} />
          <PartMaterial {...metal} />
        </mesh>
      ))}
      {PORTS.map((p, i) => (
        <mesh key={i} position={[(p.side * (w - t)) / 2, h * 0.5, p.z]}>
          <boxGeometry args={[t + 0.004, p.height, p.length]} />
          <PartMaterial color="#050506" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[(w - t) / 2, h * 0.5, -0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, t + 0.004, 20]} />
        <PartMaterial color="#050506" roughness={0.9} />
      </mesh>
      <Scatter items={vents} color="#050506" roughness={0.9} />
    </group>
  );
}

export function Chassis(props: { w: number; h: number; d: number }) {
  const { realistic } = useScene();
  return realistic ? <RealisticChassis {...props} /> : <SchematicChassis {...props} />;
}

// ───────────────────────────── Keyboard deck ─────────────────────────────

interface Key {
  x: number;
  z: number;
  w: number;
}

const KEY = 0.14;

function useKeys(): Key[] {
  return useMemo(() => {
    const out: Key[] = [];
    const rows = 6;
    const cols = 14;
    const gap = 0.025;
    const startX = -((cols * KEY + (cols - 1) * gap) / 2);
    for (let r = 0; r < rows; r++) {
      const z = -0.72 + r * (KEY + gap) * (r === 0 ? 0.8 : 1);
      if (r === rows - 1) {
        out.push({ x: -0.95, z, w: KEY * 2 });
        out.push({ x: 0, z, w: KEY * 6 });
        out.push({ x: 0.95, z, w: KEY * 2 });
        continue;
      }
      for (let c = 0; c < cols; c++) {
        out.push({ x: startX + c * (KEY + gap) + KEY / 2, z, w: KEY });
      }
    }
    return out;
  }, []);
}

function SchematicDeck({ w, d }: { w: number; d: number }) {
  const keys = useKeys();
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

function cpuBadge(brand: string) {
  const vendor = /intel/i.test(brand) ? "intel" : /amd/i.test(brand) ? "AMD" : "";
  const model = brand.replace(/^(Intel|AMD)\s*(\(R\))?\s*/i, "").replace(/\(R\)|\(TM\)|Processor/gi, "").trim();
  return makeTexture(256, 256, (ctx, W, H) => {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, vendor === "AMD" ? "#1f1f1f" : "#0b2a6f");
    g.addColorStop(1, vendor === "AMD" ? "#3a3a3a" : "#1e56c9");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText(vendor, 22, 64);
    ctx.font = `800 30px ${FONT}`;
    const words = model.toUpperCase().split(/\s+/);
    words.slice(0, 4).forEach((wd, i) => ctx.fillText(wd, 22, 120 + i * 34));
  });
}

function RealisticDeck({ w, d }: { w: number; d: number }) {
  const { exploded, machine } = useScene();
  const keys = useKeys();
  const keyGeom = useMemo(() => new RoundedBoxGeometry(KEY, 0.014, 0.13, 2, 0.012), []);
  useDispose(keyGeom);
  const badge = useMemo(() => cpuBadge(machine.cpu.brand), [machine.cpu.brand]);
  useDispose(badge);
  const thinkpad = /thinkpad/i.test(`${machine.system.family} ${machine.system.model}`);
  const items = useMemo(
    () => keys.map((k): Box => ({ p: [k.x, 0.013, k.z], s: [k.w / KEY, 1, 1] })),
    [keys],
  );
  // Assembled, the top case is translucent so the internals stay visible; exploded, it's solid.
  const o = exploded ? 1 : 0.2;
  const ko = exploded ? 1 : 0.4;
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, 0.012, d]} />
        <PartMaterial color={REAL.chassis} metalness={0.85} roughness={0.42} opacity={o} />
      </mesh>
      <Scatter items={items} geometry={keyGeom} color={REAL.keycap} roughness={0.55} opacity={ko} />
      <mesh position={[0, 0.0075, d / 2 - 0.42]}>
        <boxGeometry args={[0.95, 0.003, 0.5]} />
        <PartMaterial color="#1c1d21" metalness={0.2} roughness={0.25} opacity={ko} />
      </mesh>
      <mesh position={[w / 2 - 0.22, 0.009, -d / 2 + 0.16]}>
        <cylinderGeometry args={[0.035, 0.035, 0.006, 24]} />
        <PartMaterial color="#0c0c0e" metalness={0.4} roughness={0.2} opacity={ko} />
      </mesh>
      <Decal position={[w / 2 - 0.42, 0.0065, d / 2 - 0.3]} size={[0.16, 0.16]} map={badge} roughness={0.3} opacity={ko} />
      {thinkpad && (
        <group>
          <mesh position={[0, 0.02, -0.142]}>
            <cylinderGeometry args={[0.018, 0.018, 0.014, 20]} />
            <PartMaterial color="#d41b2c" roughness={0.8} />
          </mesh>
          {[-0.2, 0, 0.2].map((x) => (
            <group key={x} position={[x, 0.009, 0.345]}>
              <mesh>
                <boxGeometry args={[x === 0 ? 0.16 : 0.22, 0.006, 0.07]} />
                <PartMaterial color={REAL.keycap} roughness={0.55} opacity={ko} />
              </mesh>
              {x !== 0 && (
                <mesh position={[x > 0 ? -0.1 : 0.1, 0.0035, 0]}>
                  <boxGeometry args={[0.008, 0.002, 0.07]} />
                  <PartMaterial color="#d41b2c" roughness={0.6} opacity={ko} />
                </mesh>
              )}
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

export function Deck(props: { w: number; d: number }) {
  const { realistic } = useScene();
  return realistic ? <RealisticDeck {...props} /> : <SchematicDeck {...props} />;
}

// ───────────────────────────── Lid ─────────────────────────────

function useLidSwing() {
  const { exploded } = useScene();
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.x = MathUtils.damp(ref.current.rotation.x, exploded ? -0.12 : -0.3, 4, dt);
  });
  return ref;
}

function SchematicLid({ w, h }: { w: number; h: number }) {
  const ref = useLidSwing();
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

function drawDesktop(ctx: CanvasRenderingContext2D, W: number, H: number, m: MachineInfo) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b1026");
  bg.addColorStop(0.55, "#1b1446");
  bg.addColorStop(1, "#0a2a3f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, c] of [
    [0.2, 0.3, 0.45, "rgba(56,189,248,0.22)"],
    [0.8, 0.75, 0.5, "rgba(168,85,247,0.22)"],
    [0.65, 0.15, 0.3, "rgba(34,211,238,0.14)"],
  ] as const) {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = "rgba(5,7,13,0.75)";
  ctx.fillRect(0, 0, W, 40);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = `600 22px ${MONO}`;
  ctx.fillText("1  2  3  4", 20, 28);
  ctx.textAlign = "center";
  const at = new Date(m.collectedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  ctx.fillText(
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`,
    W / 2,
    28,
  );
  ctx.textAlign = "left";

  const x0 = W * 0.2;
  const y0 = H * 0.2;
  const tw = W * 0.6;
  const th = H * 0.58;
  ctx.fillStyle = "rgba(10,12,20,0.88)";
  ctx.fillRect(x0, y0, tw, th);
  ctx.strokeStyle = "rgba(125,211,252,0.6)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x0, y0, tw, th);

  const builtin = m.displays.find((d) => d.builtin);
  const rows: [string, string][] = [
    ["OS", `${m.os.distro} ${m.os.arch}`],
    ["Host", m.system.family || m.system.model],
    ["Kernel", m.os.kernel],
    ["CPU", `${m.cpu.brand} (${m.cpu.threads})`],
    ["GPU", m.gpus[0] ? gpuName(m.gpus[0].model) : "—"],
    ["Memory", formatMem(m.memory.totalBytes)],
    ["Disk", m.disks.map((d) => formatDisk(d.sizeBytes)).join(" + ") || "—"],
    ["Display", builtin?.resX ? `${builtin.resX}×${builtin.resY}` : "—"],
  ];
  ctx.font = `700 34px ${MONO}`;
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("$ pc-xray", x0 + 36, y0 + 60);
  ctx.font = `500 28px ${MONO}`;
  rows.forEach(([k, v], i) => {
    const y = y0 + 116 + i * 44;
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(k, x0 + 36, y);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(v.length > 44 ? `${v.slice(0, 43)}…` : v, x0 + 200, y);
  });
  ["#ef4444", "#f97316", "#eab308", "#22c55e", "#22d3ee", "#3b82f6", "#a855f7", "#e2e8f0"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x0 + 36 + i * 52, y0 + th - 64, 44, 26);
  });
}

function RealisticLid({ w, h }: { w: number; h: number }) {
  const ref = useLidSwing();
  const { machine } = useScene();
  const screen = useMemo(() => makeTexture(1600, 1000, (ctx, W, H) => drawDesktop(ctx, W, H, machine)), [machine]);
  useDispose(screen);
  return (
    <group ref={ref} rotation={[-0.3, 0, 0]}>
      <mesh position={[0, h / 2, -0.012]}>
        <boxGeometry args={[w, h, 0.02]} />
        <PartMaterial color={REAL.chassis} metalness={0.85} roughness={0.42} />
      </mesh>
      <mesh position={[0, h / 2, -0.0015]}>
        <planeGeometry args={[w - 0.01, h - 0.01]} />
        <PartMaterial color="#070708" roughness={0.15} metalness={0.3} />
      </mesh>
      <mesh position={[0, h / 2 + 0.03, 0]}>
        <planeGeometry args={[w - 0.14, h - 0.2]} />
        <PartMaterial color="#ffffff" map={screen} mapGlow={0.9} roughness={0.08} metalness={0.1} />
      </mesh>
      <mesh position={[-0.05, h - 0.045, 0.001]}>
        <circleGeometry args={[0.02, 24]} />
        <meshStandardMaterial color="#111827" roughness={0.1} metalness={0.6} />
      </mesh>
      <mesh position={[0.02, h - 0.045, 0.001]}>
        <circleGeometry args={[0.008, 16]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0, 0.01, -0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, w * 0.7, 24]} />
        <PartMaterial color={REAL.chassis} metalness={0.85} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function Lid(props: { w: number; h: number }) {
  const { realistic } = useScene();
  return realistic ? <RealisticLid {...props} /> : <SchematicLid {...props} />;
}
