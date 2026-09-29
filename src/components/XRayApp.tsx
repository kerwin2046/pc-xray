"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MachineInfo } from "@/lib/types";
import { listParts, type PartId } from "@/lib/parts";
import { getInsights } from "@/lib/insights";
import { LOCALE_COOKIE, LOCALE_TAG, type Locale } from "@/lib/i18n/config";
import { uiText } from "@/lib/i18n/ui";
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
  realistic: boolean;
}

interface XRayAppProps {
  initialMachine: MachineInfo;
  initialLocale: Locale;
  initialView: InitialView;
}

export function XRayApp({ initialMachine, initialLocale, initialView }: XRayAppProps) {
  const [snapshot, setSnapshot] = useState<{ name: string; machine: MachineInfo } | null>(null);
  const machine = snapshot?.machine ?? initialMachine;
  const { live, history, status } = useLiveStats(snapshot === null);

  const [locale, setLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = LOCALE_TAG[locale];
    document.title = uiText(locale).meta.title;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  const [selected, setSelected] = useState<PartId | null>(
    () => listParts(initialMachine, initialLocale).find((p) => p.id === initialView.part)?.id ?? null,
  );
  const [hovered, setHovered] = useState<PartId | null>(null);
  const [exploded, setExploded] = useState(initialView.exploded);
  const [heatMode, setHeatMode] = useState(initialView.heat);
  const [showLabels, setShowLabels] = useState(initialView.labels);
  const [realistic, setRealistic] = useState(initialView.realistic);
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
        case "v":
          setRealistic((v) => !v);
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
    () => ({
      machine,
      live,
      selected,
      hovered,
      exploded,
      heatMode,
      showLabels,
      realistic,
      locale,
      select: setSelected,
      setHovered,
    }),
    [machine, live, selected, hovered, exploded, heatMode, showLabels, realistic, locale],
  );

  const insights = useMemo(() => getInsights(machine, live, locale), [machine, live, locale]);

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
      if (!isMachineInfo(data)) throw new Error("not a PC·XRAY snapshot");
      setSelected(null);
      setSnapshot({ name: file.name, machine: data });
    } catch {
      alert(uiText(locale).app.importError);
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
            locale={locale}
            selected={selected}
            snapshot={snapshot?.name ?? null}
            onSelect={setSelected}
            onExitSnapshot={() => setSnapshot(null)}
          />
        </div>

        <div className="flex flex-1 flex-col items-center justify-between">
          <LiveHud live={live} history={history} status={status} locale={locale} />
          <Toolbar
            locale={locale}
            onLocaleChange={setLocale}
            exploded={exploded}
            heatMode={heatMode}
            showLabels={showLabels}
            autoRotate={autoRotate}
            realistic={realistic}
            onToggleRealistic={() => setRealistic((v) => !v)}
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
          <DetailPanel
            machine={machine}
            live={live}
            locale={locale}
            selected={selected}
            insights={insights}
            onSelect={setSelected}
          />
        </div>
      </div>
    </div>
  );
}
