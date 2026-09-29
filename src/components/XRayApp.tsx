"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MachineInfo } from "@/lib/types";
import { listParts, type PartId } from "@/lib/parts";
import { getInsights } from "@/lib/insights";
import { SceneCanvas } from "@/components/scene/SceneCanvas";
import type { SceneState } from "@/components/scene/SceneContext";
import { useLiveStats } from "@/components/useLiveStats";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { LiveHud } from "@/components/ui/LiveHud";
import { Overview } from "@/components/ui/Overview";
import { Toolbar } from "@/components/ui/Toolbar";

function isMachineInfo(value: unknown): value is MachineInfo {
  const v = value as MachineInfo;
  return !!v && typeof v === "object" && Array.isArray(v.cpu?.cores) && !!v.system && !!v.memory;
}

interface InitialView {
  part: string | null;
  exploded: boolean;
  heat: boolean;
  labels: boolean;
}

interface XRayAppProps {
  initialMachine: MachineInfo;
  initialView: InitialView;
}

export function XRayApp({ initialMachine, initialView }: XRayAppProps) {
  const [snapshot, setSnapshot] = useState<{ name: string; machine: MachineInfo } | null>(null);
  const machine = snapshot?.machine ?? initialMachine;
  const { live, history, status } = useLiveStats(snapshot === null);

  const [selected, setSelected] = useState<PartId | null>(
    () => listParts(initialMachine).find((p) => p.id === initialView.part)?.id ?? null,
  );
  const [hovered, setHovered] = useState<PartId | null>(null);
  const [exploded, setExploded] = useState(initialView.exploded);
  const [heatMode, setHeatMode] = useState(initialView.heat);
  const [showLabels, setShowLabels] = useState(initialView.labels);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const reset = useCallback(() => {
    setSelected(null);
    setResetKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "e":
          setExploded((v) => !v);
          break;
        case "t":
          setHeatMode((v) => !v);
          break;
        case "l":
          setShowLabels((v) => !v);
          break;
        case "r":
          reset();
          break;
        case "escape":
          setSelected(null);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reset]);

  const state: SceneState = useMemo(
    () => ({ machine, live, selected, hovered, exploded, heatMode, showLabels, select: setSelected, setHovered }),
    [machine, live, selected, hovered, exploded, heatMode, showLabels],
  );

  const insights = useMemo(() => getInsights(machine, live), [machine, live]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(machine, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pc-xray-${(machine.system.family || machine.system.model).replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isMachineInfo(data)) throw new Error("格式不对");
      setSelected(null);
      setSnapshot({ name: file.name, machine: data });
    } catch {
      alert("无法读取这个文件：请选择由 PC·XRAY 导出的 JSON 快照。");
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#05070d] text-slate-100">
      <div className="absolute inset-0">
        <SceneCanvas state={state} autoRotate={autoRotate} resetKey={resetKey} />
      </div>

      <div className="pointer-events-none absolute inset-0 flex gap-4 p-4">
        <div className="flex flex-col gap-4">
          <Overview
            machine={machine}
            selected={selected}
            snapshot={snapshot?.name ?? null}
            onSelect={setSelected}
            onExitSnapshot={() => setSnapshot(null)}
          />
        </div>

        <div className="flex flex-1 flex-col items-center justify-between">
          <LiveHud live={live} history={history} status={status} />
          <Toolbar
            exploded={exploded}
            heatMode={heatMode}
            showLabels={showLabels}
            autoRotate={autoRotate}
            onToggleExploded={() => setExploded((v) => !v)}
            onToggleHeat={() => setHeatMode((v) => !v)}
            onToggleLabels={() => setShowLabels((v) => !v)}
            onToggleRotate={() => setAutoRotate((v) => !v)}
            onReset={reset}
            onExport={exportJson}
            onImport={importJson}
          />
        </div>

        <div className="flex max-h-full flex-col">
          <DetailPanel machine={machine} live={live} selected={selected} insights={insights} onSelect={setSelected} />
        </div>
      </div>
    </div>
  );
}
