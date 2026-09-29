/** Shared numeric primitives for the 3D scene. No React, no three.js. */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

/** An axis-aligned footprint on the board plane, centred on `(x, z)`. */
export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** A box instance: position, scale, and an optional rotation around Y. */
export interface Box {
  p: Vec3;
  s: Vec3;
  r?: number;
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
