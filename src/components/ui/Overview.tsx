"use client";

import type { MachineInfo } from "@/lib/types";
import { gpuName, listParts, type PartId } from "@/lib/parts";
import { formatDisk, formatMem } from "@/lib/format";
import { LOCALE_TAG, type Locale } from "@/lib/i18n/config";
import { uiText, type UiText } from "@/lib/i18n/ui";

function partSubtitle(id: PartId, m: MachineInfo, t: UiText["overview"]): string {
  if (id.startsWith("ram-")) {
    const mod = m.memory.modules[Number(id.slice(4))];
    return mod ? `${mod.type}-${mod.speedMTs ?? "?"} ${mod.sizeBytes ? formatMem(mod.sizeBytes) : ""}` : "";
  }
  if (id.startsWith("ssd-")) {
    const d = m.disks[Number(id.slice(4))];
    return d ? `${formatDisk(d.sizeBytes)} ${d.type}` : "";
  }
  switch (id) {
    case "cpu":
      return t.coresThreads(m.cpu.physicalCores, m.cpu.threads);
    case "gpu":
      return m.gpus[0] ? gpuName(m.gpus[0].model) : "—";
    case "battery":
      return m.battery ? `${(m.battery.maxCapacity / 1000).toFixed(0)} Wh` : "";
    case "display":
      return t.displays(m.displays.length);
    case "wifi":
      return m.network.wifi[0] ? t.wifiBt : "—";
    default:
      return "";
  }
}

interface OverviewProps {
  machine: MachineInfo;
  locale: Locale;
  selected: PartId | null;
  snapshot: string | null;
  onSelect: (id: PartId) => void;
  onExitSnapshot: () => void;
}

export function Overview({ machine, locale, selected, snapshot, onSelect, onExitSnapshot }: OverviewProps) {
  const t = uiText(locale).overview;
  return (
    <div className="pointer-events-auto w-72 rounded-xl border border-white/10 bg-slate-950/60 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs font-bold tracking-[0.3em] text-sky-400">PC·XRAY</span>
        <span className="text-[10px] text-slate-500">
          {new Date(machine.collectedAt).toLocaleString(LOCALE_TAG[locale])}
        </span>
      </div>
      <h1 className="mt-2 text-lg font-semibold leading-tight text-white">
        {machine.system.family || machine.system.model}
      </h1>
      <p className="text-xs text-slate-400">
        {machine.system.vendor} · {machine.os.distro} · {machine.os.kernel}
      </p>
      <p className="mt-1 text-xs text-slate-300">{machine.cpu.brand}</p>

      {snapshot && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 ring-1 ring-amber-400/30">
          <span className="truncate">{t.snapshot(snapshot)}</span>
          <button type="button" onClick={onExitSnapshot} className="ml-2 shrink-0 underline-offset-2 hover:underline">
            {t.backToLive}
          </button>
        </div>
      )}

      <ul className="mt-3 space-y-0.5">
        {listParts(machine, locale).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                selected === p.id ? "bg-sky-500/20 text-sky-100" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span className="shrink-0">{p.name}</span>
              <span className="truncate pl-2 text-slate-500">{partSubtitle(p.id, machine, t)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
