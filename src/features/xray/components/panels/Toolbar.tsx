"use client";

import { useRef } from "react";
import { LOCALES, type Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";

interface ToggleProps {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hotkey?: string;
}

function ToolButton({ active, onClick, children, hotkey }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-sky-500/25 text-sky-200 ring-1 ring-sky-400/60" : "text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
      {hotkey && <kbd className="rounded bg-white/10 px-1 font-mono text-[10px] text-slate-400">{hotkey}</kbd>}
    </button>
  );
}

const LOCALE_NAME: Record<Locale, string> = { en: "EN", zh: "中文" };

function LocaleSwitch({ locale, label, onChange }: { locale: Locale; label: string; onChange: (l: Locale) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-white/5 p-0.5">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={l === locale}
          lang={l}
          onClick={() => onChange(l)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            l === locale ? "bg-sky-500/25 text-sky-200" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {LOCALE_NAME[l]}
        </button>
      ))}
    </div>
  );
}

interface ToolbarProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  exploded: boolean;
  heatMode: boolean;
  showLabels: boolean;
  autoRotate: boolean;
  realistic: boolean;
  onToggleRealistic: () => void;
  onToggleExploded: () => void;
  onToggleHeat: () => void;
  onToggleLabels: () => void;
  onToggleRotate: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function Toolbar(p: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const t = uiText(p.locale).toolbar;
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1.5 shadow-2xl backdrop-blur-md">
      <ToolButton active={p.realistic} onClick={p.onToggleRealistic} hotkey="V">
        {t.realistic}
      </ToolButton>
      <ToolButton active={p.exploded} onClick={p.onToggleExploded} hotkey="E">
        {t.exploded}
      </ToolButton>
      <ToolButton active={p.heatMode} onClick={p.onToggleHeat} hotkey="T">
        {t.heat}
      </ToolButton>
      <ToolButton active={p.showLabels} onClick={p.onToggleLabels} hotkey="L">
        {t.labels}
      </ToolButton>
      <ToolButton active={p.autoRotate} onClick={p.onToggleRotate}>
        {t.rotate}
      </ToolButton>
      <ToolButton onClick={p.onReset} hotkey="R">
        {t.reset}
      </ToolButton>
      <div className="mx-1 h-5 w-px bg-white/10" />
      <ToolButton onClick={p.onExport}>{t.export}</ToolButton>
      <ToolButton onClick={() => fileRef.current?.click()}>{t.import}</ToolButton>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) p.onImport(file);
          e.target.value = "";
        }}
      />
      <div className="mx-1 h-5 w-px bg-white/10" />
      <LocaleSwitch locale={p.locale} label={t.language} onChange={p.onLocaleChange} />
    </div>
  );
}
