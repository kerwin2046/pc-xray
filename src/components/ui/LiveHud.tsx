"use client";

import type { LiveStats } from "@/lib/types";
import { formatMem, formatTemp } from "@/lib/format";
import type { LiveStatus } from "@/components/useLiveStats";

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

const STATUS_TEXT: Record<LiveStatus, { text: string; dot: string }> = {
  connecting: { text: "连接中", dot: "bg-slate-400" },
  live: { text: "实时", dot: "bg-emerald-400 animate-pulse" },
  error: { text: "连接断开", dot: "bg-red-500" },
  off: { text: "快照", dot: "bg-amber-400" },
};

export function LiveHud({ live, history, status }: { live: LiveStats | null; history: number[]; status: LiveStatus }) {
  const s = STATUS_TEXT[status];
  const memPct = live ? (live.memory.usedBytes / live.memory.totalBytes) * 100 : 0;
  return (
    <div className="pointer-events-auto flex items-stretch divide-x divide-white/10 rounded-xl border border-white/10 bg-slate-950/60 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 text-xs text-slate-300">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
        {s.text}
      </div>
      {live ? (
        <>
          <Metric label="CPU" value={`${Math.round(live.cpu.load)}%`} sub={formatTemp(live.cpu.packageTemp)}>
            <Sparkline values={history} />
          </Metric>
          <Metric label="内存" value={formatMem(live.memory.usedBytes)} sub={`/ ${formatMem(live.memory.totalBytes)}`}>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${memPct > 85 ? "bg-amber-400" : "bg-sky-400"}`}
                style={{ width: `${memPct}%` }}
              />
            </div>
          </Metric>
          <Metric label="风扇" value={live.fanRpm ? `${live.fanRpm}` : "停转"} sub={live.fanRpm ? "RPM" : undefined} />
          {live.battery && (
            <Metric
              label="电池"
              value={`${Math.round(live.battery.percent)}%`}
              sub={live.battery.charging ? "充电中" : live.battery.acConnected ? "接电源" : "放电"}
            />
          )}
        </>
      ) : (
        <div className="px-4 py-3 text-xs text-slate-400">
          {status === "off" ? "正在查看导入的快照，没有实时数据" : "等待数据…"}
        </div>
      )}
    </div>
  );
}
