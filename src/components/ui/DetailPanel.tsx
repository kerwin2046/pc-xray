"use client";

import type { LiveStats, MachineInfo } from "@/lib/types";
import { getPartDetail, type CoreRow, type PartId } from "@/lib/parts";
import type { Insight, InsightLevel } from "@/lib/insights";
import { formatGHz, formatTemp } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { detailText } from "@/lib/i18n/detail";
import { uiText } from "@/lib/i18n/ui";
import { CORE_COLOR } from "@/components/scene/colors";

const LEVEL_STYLE: Record<InsightLevel, string> = {
  ok: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  info: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  warn: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  danger: "border-red-400/40 bg-red-500/15 text-red-200",
};

function CoreGrid({ cores, locale }: { cores: CoreRow[]; locale: Locale }) {
  const kindLabel = detailText(locale).coreKind;
  const threads = uiText(locale).panel.threads;
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {cores.map((c) => (
        <div key={`${c.kind}-${c.coreId}`} className="rounded-md bg-white/5 px-2 py-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium" style={{ color: CORE_COLOR[c.kind] }}>
              {kindLabel[c.kind]} #{c.coreId}
            </span>
            <span className="font-mono text-slate-400">{c.maxMHz ? formatGHz(c.maxMHz) : ""}</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${c.load ?? 0}%`, background: CORE_COLOR[c.kind] }}
            />
          </div>
          <div className="mt-0.5 flex justify-between font-mono text-[10px] text-slate-400">
            <span>{c.load === null ? "—" : `${Math.round(c.load)}%`}</span>
            <span>
              {threads(c.threads)} · {formatTemp(c.temp)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface DetailPanelProps {
  machine: MachineInfo;
  live: LiveStats | null;
  locale: Locale;
  selected: PartId | null;
  insights: Insight[];
  onSelect: (id: PartId | null) => void;
}

export function DetailPanel({ machine, live, locale, selected, insights, onSelect }: DetailPanelProps) {
  const t = uiText(locale).panel;

  if (!selected) {
    const shortcuts: [string, string][] = [
      ["V", t.keys.v],
      ["E", t.keys.e],
      ["T", t.keys.t],
      ["L", t.keys.l],
      ["R", t.keys.r],
      ["Esc", t.keys.esc],
    ];
    return (
      <div className="pointer-events-auto flex max-h-full w-[380px] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 shadow-2xl backdrop-blur-md">
        <div className="border-b border-white/10 p-4">
          <h2 className="text-sm font-semibold text-white">{t.title}</h2>
          <p className="mt-1 text-xs text-slate-400">{t.intro}</p>
        </div>
        <div className="space-y-2 overflow-y-auto p-4">
          {insights.map((ins, i) => (
            <button
              key={i}
              type="button"
              onClick={() => ins.part && onSelect(ins.part)}
              className={`block w-full rounded-lg border px-3 py-2 text-left transition-transform hover:translate-x-0.5 ${LEVEL_STYLE[ins.level]}`}
            >
              <div className="text-xs font-semibold">{ins.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed opacity-90">{ins.detail}</div>
            </button>
          ))}
          <div className="pt-2 text-[11px] leading-relaxed text-slate-500">
            {t.shortcuts}{" "}
            {shortcuts.map(([key, label], i) => (
              <span key={key}>
                {i > 0 && " · "}
                <kbd className="font-mono">{key}</kbd> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const detail = getPartDetail(selected, machine, live, locale);

  return (
    <div className="pointer-events-auto flex max-h-full w-[380px] flex-col overflow-hidden rounded-xl border border-sky-400/20 bg-slate-950/70 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between border-b border-white/10 p-4">
        <div>
          <h2 className="text-base font-semibold text-white">{detail.title}</h2>
          <p className="text-xs text-sky-300">{detail.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label={t.close}
        >
          ✕
        </button>
      </div>
      <div className="space-y-4 overflow-y-auto p-4">
        <div className="space-y-2 text-[13px] leading-relaxed text-slate-300">
          {detail.summary.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>

        {detail.cores && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.perCore}</h3>
            <CoreGrid cores={detail.cores} locale={locale} />
          </section>
        )}

        {detail.sections
          .filter((s) => s.rows.length > 0)
          .map((section) => (
            <section key={section.title}>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </h3>
              <dl className="divide-y divide-white/5 rounded-lg bg-white/[0.03]">
                {section.rows.map((row, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 px-3 py-1.5 text-xs">
                    <dt className="shrink-0 text-slate-400">{row.label}</dt>
                    <dd className="text-right">
                      <div className="font-medium text-slate-100">{row.value}</div>
                      {row.hint && <div className="text-[10px] text-slate-500">{row.hint}</div>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
      </div>
    </div>
  );
}
