import type { CoreKind, LiveStats, MachineInfo } from "@/lib/types";
import { formatCache, formatDisk, formatGHz, formatMem, formatPct, formatTemp } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { detailText, formFactorText, type DetailText } from "@/lib/i18n/detail";

export type PartId =
  | "board"
  | "cpu"
  | "gpu"
  | `ram-${number}`
  | `ssd-${number}`
  | "battery"
  | "cooling"
  | "wifi"
  | "display"
  | "input";

export interface DetailRow {
  label: string;
  value: string;
  hint?: string;
}

export interface DetailSection {
  title: string;
  rows: DetailRow[];
}

export interface CoreRow {
  kind: CoreKind;
  coreId: number;
  maxMHz: number;
  threads: number;
  load: number | null;
  temp: number | null;
}

export interface PartDetail {
  title: string;
  subtitle: string;
  summary: string[];
  sections: DetailSection[];
  cores?: CoreRow[];
}

export function gpuName(model: string): string {
  return /\[(.+)\]/.exec(model)?.[1] ?? model;
}

export function listParts(machine: MachineInfo, locale: Locale): { id: PartId; name: string }[] {
  const n = detailText(locale).parts;
  return [
    { id: "cpu", name: n.cpu },
    { id: "gpu", name: n.gpu },
    ...machine.memory.modules.map((_, i) => ({ id: `ram-${i}` as PartId, name: n.ram(i + 1) })),
    ...machine.disks.map((_, i) => ({ id: `ssd-${i}` as PartId, name: n.ssd })),
    { id: "cooling", name: n.cooling },
    { id: "wifi", name: n.wifi },
    ...(machine.battery ? [{ id: "battery" as PartId, name: n.battery }] : []),
    { id: "board", name: n.board },
    { id: "display", name: n.display },
    { id: "input", name: n.input },
  ];
}

function tempHint(t: DetailText, c: number | null | undefined, warm: number, hot: number): string | undefined {
  if (c == null) return undefined;
  if (c >= hot) return t.temp.hot;
  if (c >= warm) return t.temp.warm;
  return t.temp.cool;
}

function cpuDetail(t: DetailText, m: MachineInfo, live: LiveStats | null): PartDetail {
  const { cpu } = m;
  const c = t.cpu;
  const pCores = cpu.cores.filter((k) => k.kind === "P");
  const htCores = pCores.filter((k) => k.cpus.length > 1).length;
  const pFreqs = [...new Set(pCores.map((k) => k.maxMHz))].sort((a, b) => b - a);

  const summary = [c.intro];
  if (cpu.eCores + cpu.lpeCores > 0) {
    const parts = [c.pCores(cpu.pCores)];
    if (cpu.eCores) parts.push(c.eCores(cpu.eCores));
    if (cpu.lpeCores) parts.push(c.lpeCores(cpu.lpeCores));
    summary.push(c.hybrid(cpu.brand, parts));
  } else {
    summary.push(c.plain(cpu.brand, cpu.physicalCores));
  }
  if (htCores > 0) summary.push(c.ht(htCores, cpu.threads, cpu.physicalCores));
  if (pFreqs.length > 1) {
    const top = pCores.filter((k) => k.maxMHz === pFreqs[0]).length;
    summary.push(c.favored(top, formatGHz(pFreqs[0]), formatGHz(pFreqs[pFreqs.length - 1])));
  }
  if (cpu.lpeCores > 0) summary.push(c.lpeIsland);

  const perCpu = live?.cpu.perCpu;
  const cores: CoreRow[] = cpu.cores.map((k) => ({
    kind: k.kind,
    coreId: k.coreId,
    maxMHz: k.maxMHz,
    threads: k.cpus.length,
    load: perCpu ? k.cpus.reduce((s, i) => s + (perCpu[i] ?? 0), 0) / k.cpus.length : null,
    temp: live?.cpu.coreTemps[k.coreId] ?? null,
  }));

  const sections: DetailSection[] = [
    {
      title: t.common.specs,
      rows: [
        { label: t.common.model, value: cpu.brand },
        {
          label: c.coresThreads,
          value: c.coresThreadsValue(cpu.physicalCores, cpu.threads),
          hint: [
            cpu.pCores && `${cpu.pCores}P`,
            cpu.eCores && `${cpu.eCores}E`,
            cpu.lpeCores && `${cpu.lpeCores}LP-E`,
          ]
            .filter(Boolean)
            .join(" + "),
        },
        { label: c.freqRange, value: `${cpu.speedMinGHz} – ${cpu.speedMaxGHz} GHz` },
        { label: c.governor, value: cpu.governor || "—" },
      ],
    },
    {
      title: c.cacheTitle,
      rows: [
        { label: c.l1d, value: formatCache(cpu.cache.l1d), hint: c.perCoreTotal },
        { label: c.l1i, value: formatCache(cpu.cache.l1i), hint: c.perCoreTotal },
        { label: "L2", value: formatCache(cpu.cache.l2), hint: c.allTotal },
        { label: "L3", value: formatCache(cpu.cache.l3), hint: c.shared },
      ],
    },
    {
      title: c.featuresTitle,
      rows: cpu.features.map((f) => {
        const [name, desc] = t.features[f] ?? [f, ""];
        return { label: name, value: desc };
      }),
    },
  ];

  if (live) {
    sections.unshift({
      title: t.common.live,
      rows: [
        { label: c.load, value: formatPct(live.cpu.load) },
        { label: c.avgFreq, value: live.cpu.speedGHz ? `${live.cpu.speedGHz.toFixed(2)} GHz` : "—" },
        {
          label: c.packageTemp,
          value: formatTemp(live.cpu.packageTemp),
          hint: tempHint(t, live.cpu.packageTemp, 70, 90),
        },
      ],
    });
  }

  return { title: c.title, subtitle: cpu.brand, summary, sections, cores };
}

function gpuDetail(t: DetailText, m: MachineInfo, live: LiveStats | null): PartDetail {
  const g = t.gpu;
  const gpu = m.gpus[0];
  const name = gpu ? gpuName(gpu.model) : t.common.notDetected;
  const summary = [g.intro];
  if (gpu?.integrated) {
    summary.push(g.integrated);
    if (m.memory.channels === 2) summary.push(g.dualChannel);
    summary.push(g.usage);
  }
  return {
    title: g.title,
    subtitle: name,
    summary,
    sections: [
      {
        title: t.common.specs,
        rows: [
          { label: t.common.model, value: name },
          { label: t.common.vendor, value: gpu?.vendor ?? "—" },
          { label: t.common.type, value: gpu?.integrated ? g.integratedType : g.discreteType },
          {
            label: g.vram,
            value: gpu?.integrated ? g.sharedVram : gpu?.vramMB ? `${gpu.vramMB} MB` : "—",
          },
          ...(live
            ? [{ label: t.common.temp, value: formatTemp(live.gpuTemp), hint: tempHint(t, live.gpuTemp, 70, 90) }]
            : []),
        ],
      },
      {
        title: g.displays,
        rows: m.displays.map((d) => ({
          label: d.builtin ? g.builtin : d.connection,
          value: d.resX ? `${d.resX}×${d.resY} @ ${d.refreshHz ?? "?"}Hz` : "—",
        })),
      },
    ],
  };
}

function ramDetail(t: DetailText, m: MachineInfo, live: LiveStats | null, index: number): PartDetail {
  const r = t.ram;
  const mod = m.memory.modules[index];
  const perChannelGBs = mod?.speedMTs ? (mod.speedMTs * 8) / 1000 : null;
  const channels = m.memory.channels ?? 1;
  const kind = mod ? `${mod.type} ${formFactorText(t, mod.formFactor)}` : "";
  const summary = [r.intro];
  if (mod?.speedMTs && perChannelGBs) {
    summary.push(r.bandwidth(mod.type, mod.speedMTs, perChannelGBs.toFixed(1)));
    if (channels === 2) summary.push(r.dual(m.memory.modules.length, (perChannelGBs * 2).toFixed(1)));
  }
  summary.push(r.spd);

  const used = live ? live.memory.usedBytes / live.memory.totalBytes : null;
  return {
    title: t.parts.ram(index + 1),
    subtitle: kind,
    summary,
    sections: [
      {
        title: r.thisModule,
        rows: mod
          ? [
              { label: r.slot, value: mod.slot },
              {
                label: t.common.capacity,
                value: mod.sizeBytes ? formatMem(mod.sizeBytes) : "—",
                hint: mod.sizeEstimated ? r.estimated : undefined,
              },
              { label: t.common.type, value: kind },
              { label: r.speed, value: mod.speedMTs ? `${mod.speedMTs} MT/s` : "—" },
              { label: r.dies, value: mod.dieDensityGb ? r.diesValue(mod.dieDensityGb, mod.ioWidth ?? "?") : "—" },
              ...(live?.moduleTemps[index] != null
                ? [{ label: t.common.temp, value: formatTemp(live.moduleTemps[index]) }]
                : []),
            ]
          : [],
      },
      {
        title: r.system,
        rows: [
          { label: r.usable, value: formatMem(m.memory.totalBytes), hint: r.usableHint },
          {
            label: r.channels,
            value: channels === 2 ? r.dualChannel : channels === 1 ? r.singleChannel : t.common.unknown,
          },
          ...(live && used !== null
            ? [
                {
                  label: r.used,
                  value: r.usedValue(formatMem(live.memory.usedBytes), formatPct(used * 100)),
                  hint: used > 0.85 ? r.tight : undefined,
                },
                { label: r.swapUsed, value: formatMem(live.memory.swapUsedBytes) },
              ]
            : []),
        ],
      },
    ],
  };
}

function ssdDetail(t: DetailText, m: MachineInfo, live: LiveStats | null, index: number): PartDetail {
  const s = t.ssd;
  const disk = m.disks[index];
  const summary = [s.intro];
  if (disk?.type === "NVMe") summary.push(s.nvme);
  if (m.volumes.some((v) => v.device.startsWith("/dev/mapper/"))) summary.push(s.luks);
  return {
    title: s.title,
    subtitle: disk?.name ?? "",
    summary,
    sections: [
      {
        title: t.common.specs,
        rows: disk
          ? [
              { label: t.common.model, value: disk.name },
              { label: t.common.capacity, value: formatDisk(disk.sizeBytes) },
              { label: s.interface, value: `${disk.type} / ${disk.interface}` },
              { label: s.firmware, value: disk.firmware || "—" },
              ...(live
                ? [{ label: t.common.temp, value: formatTemp(live.ssdTemp), hint: tempHint(t, live.ssdTemp, 55, 70) }]
                : []),
            ]
          : [],
      },
      {
        title: s.partitions,
        rows: m.volumes.map((v) => ({
          label: v.mounts[0],
          value: `${formatDisk(v.usedBytes)} / ${formatDisk(v.sizeBytes)}`,
          hint: `${v.fsType}${v.device.startsWith("/dev/mapper/") ? s.encrypted : ""}${
            v.mounts.length > 1 ? s.alsoMounted(v.mounts.slice(1)) : ""
          }`,
        })),
      },
    ],
  };
}

function batteryDetail(t: DetailText, m: MachineInfo, live: LiveStats | null): PartDetail {
  const bt = t.battery;
  const b = m.battery!;
  const health = b.designedCapacity ? (b.maxCapacity / b.designedCapacity) * 100 : null;
  const percent = live?.battery?.percent ?? b.percent;
  const ac = live?.battery?.acConnected ?? b.acConnected;
  const charging = live?.battery?.charging ?? b.charging;
  const summary = [bt.intro];
  if (health !== null) {
    const h = health.toFixed(1);
    summary.push(health >= 90 ? bt.good(h, b.cycleCount) : health >= 80 ? bt.normal(h) : bt.worn(h));
  }
  if (ac && percent >= 95) summary.push(bt.threshold);
  return {
    title: bt.title,
    subtitle: `${b.manufacturer} ${b.model}`,
    summary,
    sections: [
      {
        title: t.common.status,
        rows: [
          { label: bt.charge, value: formatPct(percent) },
          { label: bt.power, value: ac ? (charging ? bt.acCharging : bt.ac) : bt.onBattery },
          { label: bt.health, value: health !== null ? formatPct(health, 1) : "—" },
          { label: bt.cycles, value: bt.cyclesValue(b.cycleCount) },
        ],
      },
      {
        title: t.common.specs,
        rows: [
          { label: bt.design, value: `${(b.designedCapacity / 1000).toFixed(1)} Wh` },
          { label: bt.full, value: `${(b.maxCapacity / 1000).toFixed(1)} Wh` },
          { label: t.common.type, value: b.chemistry || "—" },
          { label: bt.manufacturer, value: b.manufacturer || "—" },
        ],
      },
    ],
  };
}

function coolingDetail(t: DetailText, live: LiveStats | null): PartDetail {
  const c = t.cooling;
  return {
    title: c.title,
    subtitle: c.subtitle,
    summary: c.intro,
    sections: [
      {
        title: t.common.live,
        rows: live
          ? [
              { label: c.fan, value: live.fanRpm ? `${live.fanRpm} RPM` : t.common.fanStopped },
              {
                label: c.cpuPackage,
                value: formatTemp(live.cpu.packageTemp),
                hint: tempHint(t, live.cpu.packageTemp, 70, 90),
              },
              { label: "GPU", value: formatTemp(live.gpuTemp), hint: tempHint(t, live.gpuTemp, 70, 90) },
              { label: c.cpuLoad, value: formatPct(live.cpu.load) },
            ]
          : [{ label: c.note, value: c.noLive }],
      },
    ],
  };
}

function wifiDetail(t: DetailText, m: MachineInfo, live: LiveStats | null): PartDetail {
  const w = t.wifi;
  const wifi = m.network.wifi[0];
  const iface = m.network.interfaces.find((n) => n.type === "wireless");
  const bt = m.peripherals.find((p) => /bluetooth/i.test(p.name));
  const summary = [w.intro];
  if (wifi && /CNVi/i.test(wifi.model)) summary.push(w.cnvi);
  return {
    title: w.title,
    subtitle: wifi ? `${wifi.vendor} ${wifi.model}` : t.common.notDetected,
    summary,
    sections: [
      {
        title: t.common.status,
        rows: [
          { label: "Wi-Fi", value: wifi?.model ?? "—" },
          { label: w.linkSpeed, value: iface?.speedMbps ? `${iface.speedMbps} Mbps` : w.disconnected },
          { label: w.bluetooth, value: bt?.name ?? "—" },
          ...(live ? [{ label: t.common.temp, value: formatTemp(live.wifiTemp) }] : []),
        ],
      },
    ],
  };
}

function displayDetail(t: DetailText, m: MachineInfo): PartDetail {
  const d = t.display;
  const builtin = m.displays.find((s) => s.builtin);
  return {
    title: d.title,
    subtitle: builtin?.resX ? `${builtin.resX}×${builtin.resY}` : "",
    summary: [d.intro, ...(m.displays.length > 1 ? [d.multi(m.displays.length)] : [])],
    sections: [
      {
        title: d.connected,
        rows: m.displays.map((s) => ({
          label: s.builtin ? d.builtin(s.connection) : d.external(s.connection),
          value: s.resX ? `${s.resX}×${s.resY}` : "—",
          hint: s.refreshHz
            ? d.megapixels(s.refreshHz, (((s.resX ?? 0) * (s.resY ?? 0)) / 1e6).toFixed(1))
            : undefined,
        })),
      },
    ],
  };
}

function inputDetail(t: DetailText, m: MachineInfo): PartDetail {
  const i = t.input;
  return {
    title: i.title,
    subtitle: i.subtitle(m.peripherals.length),
    summary: [i.intro],
    sections: [
      { title: i.usb, rows: m.peripherals.map((p) => ({ label: p.type, value: p.name })) },
      { title: i.audio, rows: m.audio.map((a) => ({ label: i.audioLabel, value: a })) },
    ],
  };
}

function boardDetail(t: DetailText, m: MachineInfo): PartDetail {
  const b = t.board;
  return {
    title: b.title,
    subtitle: `${m.system.vendor} ${m.system.family}`,
    summary: b.intro,
    sections: [
      {
        title: b.machine,
        rows: [
          { label: t.common.vendor, value: m.system.vendor },
          { label: t.common.model, value: m.system.family || m.system.model },
          { label: b.machineType, value: m.system.model },
          { label: t.common.type, value: m.system.chassis },
          { label: b.board, value: m.system.board },
        ],
      },
      {
        title: b.firmware,
        rows: [
          { label: b.biosVersion, value: m.system.bios.version },
          { label: b.biosDate, value: m.system.bios.releaseDate },
        ],
      },
      {
        title: b.os,
        rows: [
          { label: b.distro, value: m.os.distro },
          { label: b.kernel, value: m.os.kernel },
          { label: b.arch, value: m.os.arch },
          { label: b.hostname, value: m.os.hostname },
        ],
      },
    ],
  };
}

export function getPartDetail(id: PartId, m: MachineInfo, live: LiveStats | null, locale: Locale): PartDetail {
  const t = detailText(locale);
  if (id.startsWith("ram-")) return ramDetail(t, m, live, Number(id.slice(4)));
  if (id.startsWith("ssd-")) return ssdDetail(t, m, live, Number(id.slice(4)));
  switch (id) {
    case "cpu":
      return cpuDetail(t, m, live);
    case "gpu":
      return gpuDetail(t, m, live);
    case "battery":
      return batteryDetail(t, m, live);
    case "cooling":
      return coolingDetail(t, live);
    case "wifi":
      return wifiDetail(t, m, live);
    case "display":
      return displayDetail(t, m);
    case "input":
      return inputDetail(t, m);
    default:
      return boardDetail(t, m);
  }
}
