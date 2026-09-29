"use client";

import { Instance, Instances } from "@react-three/drei";
import type { BufferGeometry } from "three";
import { PartMaterial, type PartMaterialProps } from "../Part";
import type { Box } from "./geometry";

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
