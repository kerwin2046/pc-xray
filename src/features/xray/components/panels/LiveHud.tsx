"use client";

import type { LiveStats } from "@/types/hardware";
import { formatMem, formatTemp } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";
import type { LiveStatus } from "@/features/xray/hooks/useLiveStats";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-6 w-24" />;
  const w = 96;
  const h = 24;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / 100) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="rgba(56,189,248,0.15)" stroke="none" />
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth={1.5} />
    </svg>
  );
}

function Metric({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
        <div className="font-mono text-sm font-semibold tabular-nums text-slate-100">
          {value}
          {sub && <span className="ml-1 text-xs font-normal text-slate-400">{sub}</span>}
        </div>
      </div>
      {children}
    </div>
  );
}

const STATUS_DOT: Record<LiveStatus, string> = {
  connecting: "bg-slate-400",
  live: "bg-emerald-400 animate-pulse",
  error: "bg-red-500",
  off: "bg-amber-400",
};

interface LiveHudProps {
  live: LiveStats | null;
  history: number[];
  status: LiveStatus;
  locale: Locale;
}

export function LiveHud({ live, history, status, locale }: LiveHudProps) {
  const t = uiText(locale).hud;
  const memPct = live ? (live.memory.usedBytes / live.memory.totalBytes) * 100 : 0;
  return (
    <div className="pointer-events-auto flex items-stretch divide-x divide-white/10 rounded-xl border border-white/10 bg-slate-950/60 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 text-xs text-slate-300">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        {t.status[status]}
      </div>
      {live ? (
        <>
          <Metric label="CPU" value={`${Math.round(live.cpu.load)}%`} sub={formatTemp(live.cpu.packageTemp)}>
            <Sparkline values={history} />
          </Metric>
          <Metric label={t.memory} value={formatMem(live.memory.usedBytes)} sub={`/ ${formatMem(live.memory.totalBytes)}`}>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${memPct > 85 ? "bg-amber-400" : "bg-sky-400"}`}
                style={{ width: `${memPct}%` }}
              />
            </div>
          </Metric>
          <Metric
            label={t.fan}
            value={live.fanRpm ? `${live.fanRpm}` : t.fanStopped}
            sub={live.fanRpm ? "RPM" : undefined}
          />
          {live.battery && (
            <Metric
              label={t.battery}
              value={`${Math.round(live.battery.percent)}%`}
              sub={live.battery.charging ? t.charging : live.battery.acConnected ? t.ac : t.discharging}
            />
          )}
        </>
      ) : (
        <div className="px-4 py-3 text-xs text-slate-400">{status === "off" ? t.snapshotNoLive : t.waiting}</div>
      )}
    </div>
  );
}
