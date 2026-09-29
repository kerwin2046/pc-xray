"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import type { PartId } from "@/lib/parts";
import { heatColor, PALETTE } from "./colors";
import { Label } from "./Label";
import { useScene } from "./SceneContext";

type Vec3 = [number, number, number];

interface PartState {
  active: boolean;
  hovered: boolean;
  dimmed: boolean;
}

const PartContext = createContext<PartState>({ active: false, hovered: false, dimmed: false });

export function usePart() {
  return useContext(PartContext);
}

interface PartProps {
  id: PartId;
  position: Vec3;
  /** Offset applied in exploded view. */
  explode?: Vec3;
  label?: string;
  labelOffset?: Vec3;
  /** Parts that stay visible (not ghosted) when this one is selected, and vice versa. */
  related?: PartId[];
  interactive?: boolean;
  children: ReactNode;
}

export function Part({
  id,
  position,
  explode = [0, 0, 0],
  label,
  labelOffset = [0, 0.12, 0],
  related = [],
  interactive = true,
  children,
}: PartProps) {
  const ref = useRef<Group>(null);
  const { selected, hovered, exploded, showLabels, select, setHovered } = useScene();

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = exploded ? 1 : 0;
    g.position.x = MathUtils.damp(g.position.x, position[0] + explode[0] * k, 5, dt);
    g.position.y = MathUtils.damp(g.position.y, position[1] + explode[1] * k, 5, dt);
    g.position.z = MathUtils.damp(g.position.z, position[2] + explode[2] * k, 5, dt);
  });

  const active = selected === id;
  const isHovered = hovered === id;
  const dimmed = selected !== null && !active && !related.includes(selected);

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(id);
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          setHovered(null);
          document.body.style.cursor = "";
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          select(active ? null : id);
        },
      }
    : {};

  return (
    <group ref={ref} position={position} {...handlers}>
      <PartContext.Provider value={{ active, hovered: isHovered, dimmed }}>{children}</PartContext.Provider>
      {label && (
        <Label
          position={labelOffset}
          text={label}
          visible={showLabels || active || isHovered}
          variant={active || isHovered ? "active" : "part"}
          dimmed={dimmed}
        />
      )}
    </group>
  );
}

interface PartMaterialProps {
  color: string;
  /** Temperature used when heat view is on. */
  heat?: number | null;
  glow?: number;
  glowColor?: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
}

export function PartMaterial({
  color,
  heat,
  glow = 0,
  glowColor,
  opacity = 1,
  metalness = 0.2,
  roughness = 0.6,
}: PartMaterialProps) {
  const { active, hovered, dimmed } = usePart();
  const { heatMode } = useScene();
  const hasHeat = heatMode && heat != null;
  const base = hasHeat ? heatColor(heat) : heatMode ? "#1e293b" : color;
  let emissive = hasHeat ? base : (glowColor ?? base);
  let intensity = hasHeat ? 0.45 : heatMode ? 0 : glow;
  // Keep self-lit meshes (cores, heat colors) in their own color; tint only plain surfaces.
  const selfLit = hasHeat || (!heatMode && glowColor !== undefined);
  if ((active || hovered) && !selfLit) {
    emissive = PALETTE.select;
    intensity = Math.max(intensity, active ? 0.18 : 0.2);
  }
  const finalOpacity = dimmed ? Math.min(opacity, 0.12) : opacity;
  return (
    <meshStandardMaterial
      color={base}
      emissive={emissive}
      emissiveIntensity={intensity}
      metalness={metalness}
      roughness={roughness}
      transparent={finalOpacity < 1}
      opacity={finalOpacity}
      depthWrite={finalOpacity >= 1}
    />
  );
}

export function GhostMaterial({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <meshStandardMaterial
      color={PALETTE.ghost}
      transparent
      opacity={opacity}
      depthWrite={false}
      roughness={0.1}
      metalness={0.1}
    />
  );
}
