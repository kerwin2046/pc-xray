"use client";

import { createContext, useContext } from "react";
import type { LiveStats, MachineInfo } from "@/lib/types";
import type { PartId } from "@/lib/parts";
import type { Locale } from "@/lib/i18n/config";

export interface SceneState {
  machine: MachineInfo;
  live: LiveStats | null;
  selected: PartId | null;
  hovered: PartId | null;
  exploded: boolean;
  heatMode: boolean;
  showLabels: boolean;
  /** Photoreal materials and detail instead of the schematic x-ray look. */
  realistic: boolean;
  locale: Locale;
  /** DOM layer over the canvas that 3D-anchored labels are appended to. */
  labelLayer?: HTMLDivElement | null;
  select: (id: PartId | null) => void;
  setHovered: (id: PartId | null) => void;
}

export const SceneContext = createContext<SceneState | null>(null);

export function useScene(): SceneState {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene must be used inside <SceneContext>");
  return ctx;
}
