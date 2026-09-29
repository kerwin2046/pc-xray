"use client";

import { useRef } from "react";

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

interface ToolbarProps {
  exploded: boolean;
  heatMode: boolean;
  showLabels: boolean;
  autoRotate: boolean;
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
  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1.5 shadow-2xl backdrop-blur-md">
      <ToolButton active={p.exploded} onClick={p.onToggleExploded} hotkey="E">
        爆炸视图
      </ToolButton>
      <ToolButton active={p.heatMode} onClick={p.onToggleHeat} hotkey="T">
        温度视图
      </ToolButton>
      <ToolButton active={p.showLabels} onClick={p.onToggleLabels} hotkey="L">
        标签
      </ToolButton>
      <ToolButton active={p.autoRotate} onClick={p.onToggleRotate}>
        自动旋转
      </ToolButton>
      <ToolButton onClick={p.onReset} hotkey="R">
        重置视角
      </ToolButton>
      <div className="mx-1 h-5 w-px bg-white/10" />
      <ToolButton onClick={p.onExport}>导出 JSON</ToolButton>
      <ToolButton onClick={() => fileRef.current?.click()}>导入快照</ToolButton>
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
    </div>
  );
}
