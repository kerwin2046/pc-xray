"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import type { PhysicalCore } from "@/lib/types";
import { CORE_KIND_LABEL } from "@/lib/parts";
import { formatGHz, formatTemp } from "@/lib/format";
import { CORE_COLOR, PALETTE, REAL } from "./colors";
import { inRects, rng, Scatter, type Box } from "./detail";
import { Label } from "./Label";
import { Part, PartMaterial, usePart } from "./Part";
import { useScene } from "./SceneContext";

const P = { w: 0.075, d: 0.09 };
const E = { w: 0.032, d: 0.04 };
const GAP = 0.012;
const PAD = 0.02;
const L3_W = 0.03;
const SIDE_W = 0.16;
const MARGIN = 0.035;
const SUBSTRATE_H = 0.02;
const TILE_H = 0.014;
const CORE_H = 0.006;
const TILE_Y = SUBSTRATE_H / 2 + TILE_H / 2;

interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface CoreRect extends Rect {
  core: PhysicalCore;
}

export interface SocLayout {
  width: number;
  depth: number;
  tiled: boolean;
  compute: Rect;
  gpu: Rect;
  soc: Rect | null;
  l3: Rect | null;
  cores: CoreRect[];
}

export function computeSocLayout(cores: PhysicalCore[]): SocLayout {
  const pCores = cores.filter((c) => c.kind === "P");
  const eCores = cores.filter((c) => c.kind === "E");
  const lpCores = cores.filter((c) => c.kind === "LPE");

  const pCols = pCores.length > 1 ? 2 : 1;
  const pRows = Math.max(1, Math.ceil(pCores.length / pCols));
  const pBlockW = pCols * P.w + (pCols - 1) * GAP;
  const pBlockD = pRows * P.d + (pRows - 1) * GAP;

  const clusterW = 2 * E.w + GAP / 2;
  const clusterD = 2 * E.d + GAP / 2;
  const clusters = Math.ceil(eCores.length / 4);
  const eCols = clusters > 3 ? 2 : clusters > 0 ? 1 : 0;
  const eRows = eCols ? Math.ceil(clusters / eCols) : 0;
  const eBlockW = eCols ? eCols * clusterW + (eCols - 1) * GAP : 0;
  const eBlockD = eRows ? eRows * clusterD + (eRows - 1) * GAP : 0;

  const computeW = PAD * 2 + pBlockW + GAP + L3_W + (eCols ? GAP + eBlockW : 0);
  const computeD = PAD * 2 + Math.max(pBlockD, eBlockD);

  const tiled = lpCores.length > 0;
  const width = MARGIN * 2 + computeW + GAP + SIDE_W;
  const depth = MARGIN * 2 + computeD;
  const left = -width / 2 + MARGIN;
  const top = -depth / 2 + MARGIN;

  const compute: Rect = { x: left + computeW / 2, z: top + computeD / 2, w: computeW, d: computeD };
  const sideX = left + computeW + GAP + SIDE_W / 2;
  const gpuD = tiled ? computeD * 0.6 : computeD;
  const gpu: Rect = { x: sideX, z: top + gpuD / 2, w: SIDE_W, d: gpuD };
  const soc: Rect | null = tiled
    ? { x: sideX, z: top + gpuD + GAP + (computeD - gpuD - GAP) / 2, w: SIDE_W, d: computeD - gpuD - GAP }
    : null;

  const rects: CoreRect[] = [];
  const cLeft = compute.x - computeW / 2 + PAD;
  const cTop = compute.z - computeD / 2 + PAD;
  pCores.forEach((core, i) => {
    const col = i % pCols;
    const row = Math.floor(i / pCols);
    rects.push({
      core,
      x: cLeft + col * (P.w + GAP) + P.w / 2,
      z: cTop + row * (P.d + GAP) + P.d / 2,
      w: P.w,
      d: P.d,
    });
  });

  const l3X = cLeft + pBlockW + GAP + L3_W / 2;
  const l3: Rect = { x: l3X, z: compute.z, w: L3_W, d: computeD - PAD * 2 };

  const eLeft = l3X + L3_W / 2 + GAP;
  eCores.forEach((core, i) => {
    const cluster = Math.floor(i / 4);
    const inCluster = i % 4;
    const cCol = Math.floor(cluster / eRows);
    const cRow = cluster % eRows;
    const baseX = eLeft + cCol * (clusterW + GAP);
    const baseZ = cTop + cRow * (clusterD + GAP);
    rects.push({
      core,
      x: baseX + (inCluster % 2) * (E.w + GAP / 2) + E.w / 2,
      z: baseZ + Math.floor(inCluster / 2) * (E.d + GAP / 2) + E.d / 2,
      w: E.w,
      d: E.d,
    });
  });

  if (soc) {
    lpCores.forEach((core, i) => {
      rects.push({
        core,
        x: soc.x - soc.w / 2 + PAD + i * (E.w + GAP / 2) + E.w / 2,
        z: soc.z,
        w: E.w,
        d: Math.min(E.d, soc.d - PAD),
      });
    });
  }

  return { width, depth, tiled, compute, gpu, soc, l3, cores: rects };
}

/** Lifts children slightly in exploded view so the chiplets separate from the substrate. */
function Lift({ by, children }: { by: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const { exploded } = useScene();
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.y = MathUtils.damp(ref.current.position.y, exploded ? by : 0, 5, dt);
  });
  return <group ref={ref}>{children}</group>;
}

/** Blocks drawn on a tile: raised in the schematic look, nearly flush with the die when realistic. */
function useBlockHeight() {
  const { realistic } = useScene();
  const h = realistic ? 0.0015 : CORE_H;
  return { h, y: TILE_H / 2 + h / 2 };
}

function Tile({ rect, label, children }: { rect: Rect; label?: string; children?: ReactNode }) {
  const { active } = usePart();
  const { exploded, realistic } = useScene();
  return (
    <group position={[rect.x, TILE_Y, rect.z]}>
      <mesh>
        <boxGeometry args={[rect.w, TILE_H, rect.d]} />
        <PartMaterial
          color={realistic ? REAL.silicon : PALETTE.silicon}
          metalness={realistic ? 0.75 : 0.5}
          roughness={realistic ? 0.12 : 0.35}
        />
      </mesh>
      {children}
      {label && (
        <Label position={[0, 0.03, -rect.d / 2 - 0.03]} text={label} visible={active && exploded} variant="tile" />
      )}
    </group>
  );
}

function CoreBlock({ rect, tile }: { rect: CoreRect; tile: Rect }) {
  const { live, realistic } = useScene();
  const [hover, setHover] = useState(false);
  const block = useBlockHeight();
  const { core } = rect;
  const perCpu = live?.cpu.perCpu;
  const load = perCpu ? core.cpus.reduce((s, i) => s + (perCpu[i] ?? 0), 0) / core.cpus.length : null;
  const temp = live?.cpu.coreTemps[core.coreId] ?? null;
  const color = CORE_COLOR[core.kind];

  return (
    <group position={[rect.x - tile.x, block.y, rect.z - tile.z]}>
      <mesh onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
        <boxGeometry args={[rect.w, block.h, rect.d]} />
        <PartMaterial
          color={realistic ? REAL.siliconCore : color}
          glowColor={color}
          glow={load === null ? 0.25 : 0.1 + (load / 100) * 1.6}
          heat={temp}
          metalness={realistic ? 0.7 : 0.2}
          roughness={realistic ? 0.18 : 0.4}
        />
      </mesh>
      <Label
        position={[0, 0.06, 0]}
        visible={hover}
        variant="tooltip"
        accent={color}
        text={[
          `${CORE_KIND_LABEL[core.kind]} #${core.coreId}`,
          `${core.maxMHz ? formatGHz(core.maxMHz) : "—"} · ${core.cpus.length} 线程`,
          ...(load !== null ? [`负载 ${Math.round(load)}% · ${formatTemp(temp)}`] : []),
        ].join("\n")}
      />
    </group>
  );
}

function GpuTile({ rect }: { rect: Rect }) {
  const { live, realistic } = useScene();
  const block = useBlockHeight();
  const blocks = useMemo(() => {
    const cols = 2;
    const rows = 4;
    const w = (rect.w - PAD * 2 - GAP) / cols;
    const d = (rect.d - PAD * 2 - GAP * (rows - 1)) / rows;
    return Array.from({ length: cols * rows }, (_, i) => ({
      x: -rect.w / 2 + PAD + (i % cols) * (w + GAP) + w / 2,
      z: -rect.d / 2 + PAD + Math.floor(i / cols) * (d + GAP) + d / 2,
      w,
      d,
    }));
  }, [rect]);

  return (
    <Part id="gpu" position={[0, 0, 0]} label="核显" labelOffset={[rect.x, 0.1, rect.z]} related={["cpu"]}>
      <Tile rect={rect} label="图形模块">
        {blocks.map((b, i) => (
          <mesh key={i} position={[b.x, block.y, b.z]}>
            <boxGeometry args={[b.w, block.h, b.d]} />
            <PartMaterial
              color={realistic ? "#463d52" : PALETTE.gpu}
              glowColor={realistic ? PALETTE.gpu : undefined}
              glow={0.35}
              heat={live?.gpuTemp}
              metalness={realistic ? 0.7 : 0.2}
              roughness={realistic ? 0.18 : 0.4}
            />
          </mesh>
        ))}
      </Tile>
    </Part>
  );
}

function useSubstrateCaps(layout: SocLayout) {
  return useMemo(() => {
    const tiles = [layout.compute, layout.gpu, ...(layout.soc ? [layout.soc] : [])];
    const r = rng(layout.cores.length * 7 + 3);
    const caps: Box[] = [];
    const edge = 0.012;
    for (let i = 0; i < 160; i++) {
      const x = (r() - 0.5) * (layout.width - edge * 2);
      const z = (r() - 0.5) * (layout.depth - edge * 2);
      if (inRects(x, z, tiles, 0.008)) continue;
      const rot = r() < 0.5 ? 0 : Math.PI / 2;
      caps.push({ p: [x, SUBSTRATE_H / 2 + 0.003, z], s: [0.011, 0.006, 0.006], r: rot });
    }
    return caps;
  }, [layout]);
}

function SubstrateDetail({ layout }: { layout: SocLayout }) {
  const caps = useSubstrateCaps(layout);
  return <Scatter items={caps} color={REAL.mlcc} roughness={0.45} />;
}

export function CpuPackage({ layout }: { layout: SocLayout }) {
  const { live, realistic } = useScene();
  const block = useBlockHeight();
  const { compute, gpu, soc, l3, cores } = layout;

  return (
    <group>
      <mesh>
        <boxGeometry args={[layout.width, SUBSTRATE_H, layout.depth]} />
        <PartMaterial
          color={realistic ? REAL.substrate : PALETTE.substrate}
          heat={live?.cpu.packageTemp}
          roughness={realistic ? 0.45 : 0.8}
          clearcoat={0.5}
        />
      </mesh>
      {realistic && <SubstrateDetail layout={layout} />}
      {!layout.tiled && (
        <mesh position={[0, SUBSTRATE_H / 2 + 0.002, 0]}>
          <boxGeometry args={[layout.width - MARGIN, 0.004, layout.depth - MARGIN]} />
          <PartMaterial color={PALETTE.silicon} />
        </mesh>
      )}
      <Lift by={layout.tiled ? 0.08 : 0}>
        <Tile rect={compute} label={layout.tiled ? "计算模块" : "处理器核心"}>
          {l3 && (
            <mesh position={[l3.x - compute.x, block.y, l3.z - compute.z]}>
              <boxGeometry args={[l3.w, block.h, l3.d]} />
              <PartMaterial
                color={realistic ? "#3d3a54" : PALETTE.l3}
                glowColor={realistic ? PALETTE.l3 : undefined}
                glow={0.3}
                metalness={realistic ? 0.7 : 0.2}
                roughness={realistic ? 0.18 : 0.6}
              />
            </mesh>
          )}
          {cores
            .filter((r) => r.core.kind !== "LPE")
            .map((r) => (
              <CoreBlock key={`${r.core.kind}-${r.core.coreId}`} rect={r} tile={compute} />
            ))}
        </Tile>
      </Lift>
      <Lift by={layout.tiled ? 0.14 : 0}>
        <GpuTile rect={gpu} />
      </Lift>
      {soc && (
        <Lift by={0.11}>
          <Tile rect={soc} label="SoC 模块">
            {cores
              .filter((r) => r.core.kind === "LPE")
              .map((r) => (
                <CoreBlock key={`LPE-${r.core.coreId}`} rect={r} tile={soc} />
              ))}
          </Tile>
        </Lift>
      )}
    </group>
  );
}
