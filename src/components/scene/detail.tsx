"use client";

import { useEffect } from "react";
import { Instance, Instances } from "@react-three/drei";
import { CanvasTexture, SRGBColorSpace, type BufferGeometry } from "three";
import { PartMaterial, type PartMaterialProps } from "./Part";

type Vec3 = [number, number, number];

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Deterministic PRNG (mulberry32) so procedural detail doesn't reshuffle between renders. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function inRects(x: number, z: number, rects: Rect[], pad = 0): boolean {
  return rects.some((r) => Math.abs(x - r.x) < r.w / 2 + pad && Math.abs(z - r.z) < r.d / 2 + pad);
}

export interface Box {
  p: Vec3;
  s: Vec3;
  r?: number;
}

/**
 * Many identical small boxes (SMD parts, fins, keys) in one draw call.
 * With a custom `geometry`, `s` scales that geometry instead of a unit box.
 */
export function Scatter({
  items,
  geometry,
  ...material
}: { items: Box[]; geometry?: BufferGeometry } & PartMaterialProps) {
  if (items.length === 0) return null;
  return (
    <Instances limit={items.length} range={items.length} geometry={geometry}>
      {!geometry && <boxGeometry />}
      <PartMaterial {...material} />
      {items.map((b, i) => (
        <Instance key={i} position={b.p} scale={b.s} rotation={[0, b.r ?? 0, 0]} />
      ))}
    </Instances>
  );
}

export const FONT = 'ui-sans-serif, system-ui, "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", sans-serif';
export const MONO = 'ui-monospace, "JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace';

export function makeTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, width, height);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function useDispose(tex: { dispose(): void }) {
  useEffect(() => () => tex.dispose(), [tex]);
}

/** A flat textured plane lying on top of a surface (stickers, silkscreen). */
export function Decal({
  position,
  size,
  color = "#ffffff",
  ...material
}: { position: Vec3; size: [number, number]; color?: string } & Omit<PartMaterialProps, "color">) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <PartMaterial color={color} {...material} />
    </mesh>
  );
}

/** Wraps text to `maxWidth`, returning at most `maxLines` lines. */
export function fitLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 2): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}
