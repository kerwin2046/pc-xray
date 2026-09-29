"use client";

import { useMemo } from "react";
import { PALETTE, REAL } from "../colors";
import { PartMaterial } from "../Part";
import {
  Decal,
  FONT,
  inRects,
  makeTexture,
  MONO,
  rng,
  Scatter,
  useDispose,
  type Box,
  type Rect,
  type Vec2,
  type Vec3,
} from "../primitives";
import { useScene } from "../SceneContext";

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
