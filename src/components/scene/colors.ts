import { Color } from "three";
import type { CoreKind } from "@/lib/types";

export const PALETTE = {
  pcb: "#0f3d2e",
  pcbTrace: "#1f7a55",
  substrate: "#1b4332",
  silicon: "#1e293b",
  chip: "#111827",
  gold: "#d4a017",
  copper: "#b87333",
  aluminum: "#9ca3af",
  battery: "#1f2937",
  batteryFill: "#22c55e",
  ghost: "#7dd3fc",
  edge: "#38bdf8",
  select: "#38bdf8",
  l3: "#a855f7",
  gpu: "#ec4899",
  npu: "#eab308",
};

/** Physically-based colors for the realistic look. */
export const REAL = {
  pcb: "#0d2e21",
  substrate: "#1b3a2a",
  silicon: "#353c4a",
  siliconCore: "#454d5f",
  chip: "#17181b",
  gold: "#e3b456",
  copper: "#c7794a",
  steel: "#b4b9c0",
  aluminum: "#9aa0a8",
  plastic: "#141518",
  chassis: "#2a2d32",
  keycap: "#18191c",
  mlcc: "#b08d62",
  resistor: "#1c1d20",
  choke: "#4d525a",
  socket: "#1d1e22",
  connector: "#e6e2d8",
};

export const CORE_COLOR: Record<CoreKind, string> = {
  P: "#f97316",
  E: "#22d3ee",
  LPE: "#a3e635",
};

const scratch = new Color();

/** 35°C → blue, ~55°C → green, ~75°C → yellow/orange, 95°C → red (hue sweep, so no grey midpoints). */
export function heatColor(celsius: number): string {
  const t = Math.min(1, Math.max(0, (celsius - 35) / 60));
  return `#${scratch.setHSL(0.62 * (1 - t), 0.9, 0.5).getHexString()}`;
}
