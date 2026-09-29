"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { useScene } from "./SceneContext";

type Vec3 = [number, number, number];
export type LabelVariant = "part" | "active" | "tile" | "tooltip";

const VARIANT_CLASS: Record<LabelVariant, string> = {
  part: "border-white/15 bg-slate-900/75 text-slate-200 text-[11px] font-medium",
  active: "border-sky-400 bg-sky-500/30 text-white text-[11px] font-medium",
  tile: "border-transparent bg-slate-950/80 text-slate-300 text-[10px]",
  tooltip: "border-white/20 bg-slate-950/90 text-slate-100 text-[11px] leading-snug shadow-lg",
};

interface LabelProps {
  position: Vec3;
  text: string;
  visible: boolean;
  variant?: LabelVariant;
  dimmed?: boolean;
  accent?: string;
}

/**
 * A DOM label pinned to a 3D point. Plain DOM nodes positioned per frame, instead of drei's <Html>,
 * which mounts a separate React root per label.
 */
export function Label({ position, text, visible, variant = "part", dimmed = false, accent }: LabelProps) {
  const anchor = useRef<Group>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const world = useRef(new Vector3());
  const { labelLayer } = useScene();

  useEffect(() => {
    if (!labelLayer) return;
    const el = document.createElement("div");
    labelLayer.appendChild(el);
    elRef.current = el;
    return () => {
      el.remove();
      elRef.current = null;
    };
  }, [labelLayer]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.textContent = text;
    el.className = `absolute left-0 top-0 whitespace-pre rounded-md border px-2 py-0.5 backdrop-blur transition-opacity will-change-transform ${VARIANT_CLASS[variant]}`;
    el.style.opacity = dimmed ? "0.3" : "1";
    el.style.borderLeftColor = accent ?? "";
    el.style.borderLeftWidth = accent ? "3px" : "";
    el.style.display = visible ? "" : "none";
  }, [labelLayer, text, variant, dimmed, accent, visible]);

  useFrame(({ camera, size }) => {
    const el = elRef.current;
    if (!visible || !el || !anchor.current) return;
    const v = anchor.current.getWorldPosition(world.current).project(camera);
    const x = (v.x * 0.5 + 0.5) * size.width;
    const y = (-v.y * 0.5 + 0.5) * size.height;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    el.style.visibility = v.z > 1 ? "hidden" : "visible";
  });

  return <group ref={anchor} position={position} />;
}
