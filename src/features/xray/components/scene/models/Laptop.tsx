"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import type { Group, Mesh, Object3D } from "three";
import type { MachineInfo } from "@/types/hardware";
import { gpuName, type PartId } from "@/lib/hardware/parts";
import { formatDisk, formatMem } from "@/lib/format";
import { uiText } from "@/i18n/ui";
import { Part } from "../Part";
import type { Rect, Vec3 } from "../primitives";
import { useScene } from "../SceneContext";
import { Battery } from "./Battery";
import { Board, type BoardFixtures } from "./Board";
import { Cooling } from "./Cooling";
import { RAM_SIZE, RamStick } from "./RamStick";
import { Chassis, Deck, Lid } from "./Shell";
import { computeSocLayout, CpuPackage, type SocLayout } from "./Soc";
import { SSD_SIZE, Ssd } from "./Ssd";
import { WIFI_SIZE, WifiCard } from "./WifiCard";

const W = 3.2;
const D = 2.2;
const H = 0.17;
const LID_H = 2.05;

const BOARD = { pos: [0.3, 0.035, -0.41] as Vec3, size: [2.3, 0.016, 1.18] as Vec3 };
const SOC_POS: Vec3 = [-0.15, 0.053, -0.55];
const BATTERY = { pos: [0, 0.04, 0.62] as Vec3, size: [2.1, 0.05, 0.6] as Vec3 };
const FAN: [number, number] = [-1.2, -0.52];
const FAN_R = 0.27;
const FINS = { from: -1.46, to: -0.94, z: -0.97 };

const LIFT = { battery: 0.3, board: 0.8, cards: 1.35, cooling: 1.95, deck: 2.6 };
const LID_EXPLODE: Vec3 = [0, 0.7, -1.1];

function ramPos(i: number): Vec3 {
  return [0.9, 0.05, -0.8 + i * 0.36];
}

function ssdPos(i: number): Vec3 {
  return [0.55 - i * 0.9, 0.05, -0.02];
}

const WIFI_POS: Vec3 = [-0.55, 0.05, -0.05];

interface Focus {
  target: Vec3;
  distance: number;
}

function add(a: Vec3, b: Vec3, k: number): Vec3 {
  return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
}

export const DEFAULT_VIEW = { position: [4.4, 3.9, 6.0] as Vec3, target: [0, 0.75, -0.25] as Vec3 };
export const EXPLODED_VIEW = { position: [6.2, 3.1, 6.4] as Vec3, target: [0, 1.35, -0.4] as Vec3 };

export function getFocus(id: PartId, exploded: boolean): Focus {
  const k = exploded ? 1 : 0;
  const lift = (y: number): Vec3 => [0, y, 0];
  if (id.startsWith("ram-")) return { target: add(ramPos(Number(id.slice(4))), lift(LIFT.cards), k), distance: 1.7 };
  if (id.startsWith("ssd-")) return { target: add(ssdPos(Number(id.slice(4))), lift(LIFT.cards), k), distance: 1.6 };
  switch (id) {
    case "cpu":
      return { target: add(SOC_POS, lift(LIFT.board), k), distance: 1.3 };
    case "gpu":
      return { target: add(SOC_POS, lift(LIFT.board + 0.14), k), distance: 1.1 };
    case "wifi":
      return { target: add(WIFI_POS, lift(LIFT.cards), k), distance: 1.3 };
    case "cooling":
      return { target: add([-0.7, 0.1, -0.7], lift(LIFT.cooling), k), distance: 2.4 };
    case "battery":
      return { target: add(BATTERY.pos, lift(LIFT.battery), k), distance: 2.8 };
    case "display":
      return { target: add([0, H + LID_H / 2, -D / 2], LID_EXPLODE, k), distance: 4 };
    case "input":
      return { target: add([0, H, 0], lift(LIFT.deck), k), distance: 3.6 };
    default:
      return { target: add(BOARD.pos, lift(LIFT.board), k), distance: 3.2 };
  }
}

/** Converts laptop-space rects to board-local ones. */
function onBoard(r: Rect): Rect {
  return { ...r, x: r.x - BOARD.pos[0], z: r.z - BOARD.pos[2] };
}

function boardFixtures(machine: MachineInfo, soc: SocLayout): BoardFixtures {
  const ram = machine.memory.modules.map((_, i) => ramPos(i));
  const ssd = machine.disks.map((_, i) => ssdPos(i));
  const [bw, , bd] = BOARD.size;
  return {
    keepOut: [
      { x: SOC_POS[0], z: SOC_POS[2], w: soc.width + 0.04, d: soc.depth + 0.04 },
      ...ram.map(([x, , z]) => ({ x, z, w: RAM_SIZE.w + 0.04, d: RAM_SIZE.d + 0.08 })),
      ...ssd.map(([x, , z]) => ({ x, z, w: SSD_SIZE.w + 0.06, d: SSD_SIZE.d + 0.04 })),
      { x: WIFI_POS[0], z: WIFI_POS[2], w: WIFI_SIZE.w + 0.06, d: WIFI_SIZE.d + 0.04 },
    ].map(onBoard),
    dimmSockets: ram.map(([x, , z]) => onBoard({ x, z: z + RAM_SIZE.d / 2 + 0.008, w: RAM_SIZE.w + 0.04, d: 0.04 })),
    m2Sockets: [
      ...ssd.map(([x, , z]) => ({ x: x - SSD_SIZE.w / 2 - 0.012, z, w: 0.035, d: SSD_SIZE.d + 0.03 })),
      { x: WIFI_POS[0] + WIFI_SIZE.w / 2 + 0.012, z: WIFI_POS[2], w: 0.035, d: WIFI_SIZE.d + 0.03 },
    ].map(onBoard),
    standoffs: [
      ...ssd.map(([x, , z]): [number, number] => [x + SSD_SIZE.w / 2 - 0.014 - BOARD.pos[0], z - BOARD.pos[2]]),
      [WIFI_POS[0] - WIFI_SIZE.w / 2 + 0.014 - BOARD.pos[0], WIFI_POS[2] - BOARD.pos[2]],
      [-bw / 2 + 0.05, -bd / 2 + 0.05],
      [bw / 2 - 0.05, -bd / 2 + 0.05],
      [bw / 2 - 0.05, bd / 2 - 0.05],
      [-bw / 2 + 0.05, bd / 2 - 0.05],
    ],
    chokes: onBoard({ x: SOC_POS[0], z: SOC_POS[2] + soc.depth / 2 + 0.07, w: soc.width * 0.9, d: 0.06 }),
  };
}

/** Realistic mode lights with a shadow-casting sun; subtrees tagged `noShadow` don't cast. */
function useShadows(root: RefObject<Group | null>, enabled: boolean, deps: unknown) {
  useLayoutEffect(() => {
    const apply = (o: Object3D, cast: boolean) => {
      const c = cast && !o.userData.noShadow;
      if ((o as Mesh).isMesh) {
        o.castShadow = enabled && c;
        o.receiveShadow = enabled;
      }
      for (const child of o.children) apply(child, c);
    };
    if (root.current) apply(root.current, true);
  }, [root, enabled, deps]);
}

export function Laptop({ machine }: { machine: MachineInfo }) {
  const { live, realistic, locale } = useScene();
  const t = uiText(locale).scene;
  const root = useRef<Group>(null);
  const soc = useMemo(() => computeSocLayout(machine.cpu.cores), [machine.cpu.cores]);
  const fixtures = useMemo(() => boardFixtures(machine, soc), [machine, soc]);
  const plateY = SOC_POS[1] + 0.045;
  const builtin = machine.displays.find((d) => d.builtin);
  const gpu = machine.gpus[0];
  useShadows(root, realistic, machine);

  const cpuLabel = t.cpu(machine.cpu.brand.replace(/^Intel |^AMD /, ""), machine.cpu.physicalCores, machine.cpu.threads);

  return (
    <group ref={root} position={[0, 0, 0.2]}>
      <Chassis w={W} h={H} d={D} />

      <Part id="board" position={BOARD.pos} explode={[0, LIFT.board, 0]} label={t.board} labelOffset={[1.0, 0.06, 0.45]}>
        <Board size={BOARD.size} fixtures={fixtures} name={machine.system.board.split(" ").slice(0, 2).join(" ")} />
      </Part>

      <Part
        id="cpu"
        position={SOC_POS}
        explode={[0, LIFT.board, 0]}
        label={cpuLabel}
        labelOffset={[-0.15, 0.3, -soc.depth / 2 - 0.12]}
        related={["gpu", "cooling"]}
      >
        <CpuPackage layout={soc} />
      </Part>

      {machine.memory.modules.map((m, i) => (
        <Part
          key={i}
          id={`ram-${i}`}
          position={ramPos(i)}
          explode={[0, LIFT.cards, 0]}
          label={`${m.type}-${m.speedMTs ?? "?"} · ${m.sizeBytes ? formatMem(m.sizeBytes) : "?"}`}
          labelOffset={[0.3, 0.08, 0]}
        >
          <RamStick index={i} module={m} />
        </Part>
      ))}

      {machine.disks.map((disk, i) => (
        <Part
          key={i}
          id={`ssd-${i}`}
          position={ssdPos(i)}
          explode={[0, LIFT.cards, 0]}
          label={`${disk.type} · ${formatDisk(disk.sizeBytes)}`}
          labelOffset={[0, 0.08, 0.08]}
        >
          <Ssd disk={disk} />
        </Part>
      ))}

      <Part id="wifi" position={WIFI_POS} explode={[0, LIFT.cards, 0]} label={t.wifi} labelOffset={[0, 0.08, 0.06]}>
        <WifiCard />
      </Part>

      <Part
        id="cooling"
        position={[0, 0, 0]}
        explode={[0, LIFT.cooling, 0]}
        label={live?.fanRpm ? t.fan(live.fanRpm) : t.cooling}
        labelOffset={[FAN[0], plateY + 0.12, FAN[1]]}
      >
        <Cooling
          plate={{ x: SOC_POS[0], z: SOC_POS[2], w: soc.width * 0.85, d: soc.depth * 0.85, y: plateY }}
          fan={FAN}
          fanRadius={FAN_R}
          fins={FINS}
        />
      </Part>

      {machine.battery && (
        <Part
          id="battery"
          position={BATTERY.pos}
          explode={[0, LIFT.battery, 0]}
          label={t.battery(Math.round(live?.battery?.percent ?? machine.battery.percent))}
          labelOffset={[0.7, 0.08, 0.1]}
        >
          <Battery size={BATTERY.size} />
        </Part>
      )}

      <Part
        id="input"
        position={[0, H, 0]}
        explode={[0, LIFT.deck, 0]}
        label={t.keyboard}
        labelOffset={[-1.1, 0.06, 0.5]}
        interactive={false}
      >
        <group userData={{ noShadow: true }}>
          <Deck w={W} d={D} />
        </group>
      </Part>

      <Part
        id="display"
        position={[0, H, -D / 2]}
        explode={LID_EXPLODE}
        label={builtin?.resX ? t.displayRes(builtin.resX, builtin.resY ?? 0) : t.display}
        labelOffset={[0, LID_H + 0.1, -0.5]}
      >
        <Lid w={W} h={LID_H} />
      </Part>

      {gpu && !gpu.integrated && (
        <Part id="gpu" position={[0.2, 0.06, -0.85]} explode={[0, LIFT.cards, 0]} label={gpuName(gpu.model)}>
          <mesh>
            <boxGeometry args={[0.35, 0.02, 0.3]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
        </Part>
      )}
    </group>
  );
}
