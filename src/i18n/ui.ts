import type { Locale } from "./config";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const en = {
  meta: {
    title: "PC·XRAY · See inside your computer",
    description: "Reads your machine's real hardware and shows what's inside as an interactive, see-through 3D model.",
  },
  toolbar: {
    realistic: "Realistic",
    exploded: "Exploded",
    heat: "Thermal",
    labels: "Labels",
    rotate: "Auto-rotate",
    reset: "Reset view",
    export: "Export JSON",
    import: "Import snapshot",
    language: "Language",
  },
  hud: {
    status: { connecting: "Connecting", live: "Live", error: "Disconnected", off: "Snapshot" },
    memory: "Memory",
    fan: "Fan",
    fanStopped: "Stopped",
    unavailable: "N/A",
    battery: "Battery",
    charging: "Charging",
    ac: "Plugged in",
    discharging: "On battery",
    snapshotNoLive: "Viewing an imported snapshot, no live data",
    waiting: "Waiting for data…",
  },
  overview: {
    coresThreads: (c: number, t: number) => `${c}C / ${t}T`,
    displays: (n: number) => plural(n, "display", "displays"),
    wifiBt: "Wi-Fi + Bluetooth",
    snapshot: (name: string) => `Snapshot: ${name}`,
    backToLive: "Back to this PC",
  },
  panel: {
    title: "System check",
    intro: "Click a part in the 3D model or the list on the left to see what it is, its specs and how it's doing right now.",
    shortcuts: "Shortcuts:",
    keys: { v: "realistic", e: "exploded", t: "thermal", l: "labels", r: "reset", esc: "deselect" },
    close: "Close",
    perCore: "Per core",
    threads: (n: number) => plural(n, "thread", "threads"),
  },
  app: {
    importError: "Couldn't read this file. Please choose a JSON snapshot exported by PC·XRAY.",
  },
  scene: {
    cpu: (model: string, c: number, t: number) => `${model} · ${c}C/${t}T`,
    board: "Motherboard",
    wifi: "Wi-Fi / Bluetooth",
    fan: (rpm: number) => `Fan ${rpm} RPM`,
    cooling: "Cooling",
    battery: (pct: number) => `Battery ${pct}%`,
    keyboard: "Keyboard",
    display: "Display",
    displayRes: (x: number, y: number) => `Display ${x}×${y}`,
    igpu: "iGPU",
    gpuTile: "Graphics tile",
    computeTile: "Compute tile",
    cpuCores: "CPU cores",
    socTile: "SoC tile",
    coreThreads: (freq: string, n: number) => `${freq} · ${plural(n, "thread", "threads")}`,
    coreLoad: (pct: number, temp: string) => `Load ${pct}% · ${temp}`,
    batteryWarning: "⚠ Do not disassemble, crush, puncture or incinerate",
  },
};

export type UiText = typeof en;

const zh: UiText = {
  meta: {
    title: "PC·XRAY · 透视你的电脑",
    description: "读取本机真实硬件信息，用可交互的 3D 透视模型展示电脑内部结构。",
  },
  toolbar: {
    realistic: "真实外观",
    exploded: "爆炸视图",
    heat: "温度视图",
    labels: "标签",
    rotate: "自动旋转",
    reset: "重置视角",
    export: "导出 JSON",
    import: "导入快照",
    language: "语言",
  },
  hud: {
    status: { connecting: "连接中", live: "实时", error: "连接断开", off: "快照" },
    memory: "内存",
    fan: "风扇",
    fanStopped: "停转",
    unavailable: "不可用",
    battery: "电池",
    charging: "充电中",
    ac: "接电源",
    discharging: "放电",
    snapshotNoLive: "正在查看导入的快照，没有实时数据",
    waiting: "等待数据…",
  },
  overview: {
    coresThreads: (c, t) => `${c} 核 ${t} 线程`,
    displays: (n) => `${n} 块屏幕`,
    wifiBt: "Wi-Fi + 蓝牙",
    snapshot: (name) => `快照：${name}`,
    backToLive: "返回本机",
  },
  panel: {
    title: "整机诊断",
    intro: "点击 3D 模型里的部件，或左侧列表，查看它是什么、参数多少、现在状态如何。",
    shortcuts: "快捷键：",
    keys: { v: "真实外观", e: "爆炸视图", t: "温度视图", l: "标签", r: "重置", esc: "取消选择" },
    close: "关闭",
    perCore: "每个核心",
    threads: (n) => `${n} 线程`,
  },
  app: {
    importError: "无法读取这个文件：请选择由 PC·XRAY 导出的 JSON 快照。",
  },
  scene: {
    cpu: (model, c, t) => `${model} · ${c}核${t}线程`,
    board: "主板",
    wifi: "Wi-Fi / 蓝牙",
    fan: (rpm) => `风扇 ${rpm} RPM`,
    cooling: "散热",
    battery: (pct) => `电池 ${pct}%`,
    keyboard: "键盘",
    display: "屏幕",
    displayRes: (x, y) => `屏幕 ${x}×${y}`,
    igpu: "核显",
    gpuTile: "图形模块",
    computeTile: "计算模块",
    cpuCores: "处理器核心",
    socTile: "SoC 模块",
    coreThreads: (freq, n) => `${freq} · ${n} 线程`,
    coreLoad: (pct, temp) => `负载 ${pct}% · ${temp}`,
    batteryWarning: "⚠ 请勿拆解、挤压或加热   Do not puncture or incinerate",
  },
};

const UI: Record<Locale, UiText> = { en, zh };

export function uiText(locale: Locale): UiText {
  return UI[locale];
}
