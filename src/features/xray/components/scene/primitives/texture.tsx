"use client";

import { useEffect } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { PartMaterial, type PartMaterialProps } from "../Part";
import type { Vec3 } from "./geometry";

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
