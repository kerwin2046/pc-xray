import type { CoreKind, LiveStats, MachineInfo } from "@/lib/types";
import { formatCache, formatDisk, formatGHz, formatMem, formatPct, formatTemp } from "@/lib/format";

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

export const CORE_KIND_LABEL: Record<CoreKind, string> = {
  P: "性能核",
  E: "能效核",
  LPE: "低功耗能效核",
};

const FEATURE_LABEL: Record<string, string> = {
  ht: "超线程：一个物理核同时跑两个线程",
  vmx: "硬件虚拟化（VT-x）：虚拟机、Docker、WSL2 更快",
  svm: "硬件虚拟化（AMD-V）：虚拟机、Docker、WSL2 更快",
  aes: "AES 加密指令：磁盘加密几乎不耗性能",
  sha_ni: "SHA 指令：哈希计算硬件加速",
  avx2: "AVX2：一次处理 256 位数据的向量指令",
  avx_vnni: "AVX-VNNI：加速 AI 推理中的整数运算",
  avx512f: "AVX-512：一次处理 512 位数据",
  fma: "FMA：乘法和加法一步完成，科学计算更快",
};

export function gpuName(model: string): string {
  return /\[(.+)\]/.exec(model)?.[1] ?? model;
}

export function listParts(machine: MachineInfo): { id: PartId; name: string }[] {
  return [
    { id: "cpu", name: "处理器" },
    { id: "gpu", name: "核显" },
    ...machine.memory.modules.map((m, i) => ({ id: `ram-${i}` as PartId, name: `内存 ${i + 1}` })),
    ...machine.disks.map((_, i) => ({ id: `ssd-${i}` as PartId, name: "固态硬盘" })),
    { id: "cooling", name: "散热" },
    { id: "wifi", name: "无线网卡" },
    ...(machine.battery ? [{ id: "battery" as PartId, name: "电池" }] : []),
    { id: "board", name: "主板" },
    { id: "display", name: "屏幕" },
    { id: "input", name: "键盘与外设" },
  ];
}

function tempHint(c: number | null | undefined, warm: number, hot: number): string | undefined {
  if (c == null) return undefined;
  if (c >= hot) return "偏热";
  if (c >= warm) return "温热，正常负载范围";
  return "凉爽";
}

function cpuDetail(m: MachineInfo, live: LiveStats | null): PartDetail {
  const { cpu } = m;
  const pCores = cpu.cores.filter((c) => c.kind === "P");
  const htCores = pCores.filter((c) => c.cpus.length > 1).length;
  const pFreqs = [...new Set(pCores.map((c) => c.maxMHz))].sort((a, b) => b - a);

  const summary = [`CPU 是电脑的“大脑”，所有程序的指令最终都由它执行。`];
  if (cpu.eCores + cpu.lpeCores > 0) {
    const parts = [`${cpu.pCores} 个性能核（P 核）负责游戏、编译这类重活`];
    if (cpu.eCores) parts.push(`${cpu.eCores} 个能效核（E 核）处理后台任务`);
    if (cpu.lpeCores) parts.push(`${cpu.lpeCores} 个低功耗能效核（LP-E 核）负责待机和轻负载`);
    summary.push(`这颗 ${cpu.brand} 采用大小核混合架构：${parts.join("；")}。`);
  } else {
    summary.push(`这颗 ${cpu.brand} 有 ${cpu.physicalCores} 个物理核心。`);
  }
  if (htCores > 0) {
    summary.push(
      `其中 ${htCores} 个 P 核支持超线程，一个核当两个用，所以系统里看到的是 ${cpu.threads} 个线程，而不是 ${cpu.physicalCores} 个。`,
    );
  }
  if (pFreqs.length > 1) {
    const top = pCores.filter((c) => c.maxMHz === pFreqs[0]).length;
    summary.push(
      `P 核的最高频率并不一样：${top} 个“偏好核”能冲到 ${formatGHz(pFreqs[0])}，其余是 ${formatGHz(pFreqs[pFreqs.length - 1])}。系统会优先把最吃性能的线程放到偏好核上。`,
    );
  }
  if (cpu.lpeCores > 0) {
    summary.push(
      "LP-E 核位于封装里单独的 SoC 模块上，不接入 L3 缓存。只做轻活时，系统可以只用它们，让整个计算模块断电省电。",
    );
  }

  const perCpu = live?.cpu.perCpu;
  const cores: CoreRow[] = cpu.cores.map((c) => ({
    kind: c.kind,
    coreId: c.coreId,
    maxMHz: c.maxMHz,
    threads: c.cpus.length,
    load: perCpu ? c.cpus.reduce((s, i) => s + (perCpu[i] ?? 0), 0) / c.cpus.length : null,
    temp: live?.cpu.coreTemps[c.coreId] ?? null,
  }));

  const sections: DetailSection[] = [
    {
      title: "规格",
      rows: [
        { label: "型号", value: cpu.brand },
        {
          label: "核心 / 线程",
          value: `${cpu.physicalCores} 核 ${cpu.threads} 线程`,
          hint: [
            cpu.pCores && `${cpu.pCores}P`,
            cpu.eCores && `${cpu.eCores}E`,
            cpu.lpeCores && `${cpu.lpeCores}LP-E`,
          ]
            .filter(Boolean)
            .join(" + "),
        },
        { label: "频率范围", value: `${cpu.speedMinGHz} – ${cpu.speedMaxGHz} GHz` },
        { label: "调频策略", value: cpu.governor || "—" },
      ],
    },
    {
      title: "缓存（越靠近核心越快、越小）",
      rows: [
        { label: "L1 数据", value: formatCache(cpu.cache.l1d), hint: "所有核合计，每核私有" },
        { label: "L1 指令", value: formatCache(cpu.cache.l1i), hint: "所有核合计，每核私有" },
        { label: "L2", value: formatCache(cpu.cache.l2), hint: "所有核合计" },
        { label: "L3", value: formatCache(cpu.cache.l3), hint: "全部核心共享" },
      ],
    },
    {
      title: "指令集特性",
      rows: cpu.features.map((f) => {
        const [name, desc] = (FEATURE_LABEL[f] ?? f).split("：");
        return { label: name, value: desc ?? "" };
      }),
    },
  ];

  if (live) {
    sections.unshift({
      title: "实时",
      rows: [
        { label: "总负载", value: formatPct(live.cpu.load) },
        { label: "当前平均频率", value: live.cpu.speedGHz ? `${live.cpu.speedGHz.toFixed(2)} GHz` : "—" },
        {
          label: "封装温度",
          value: formatTemp(live.cpu.packageTemp),
          hint: tempHint(live.cpu.packageTemp, 70, 90),
        },
      ],
    });
  }

  return { title: "处理器 CPU", subtitle: cpu.brand, summary, sections, cores };
}

function gpuDetail(m: MachineInfo, live: LiveStats | null): PartDetail {
  const gpu = m.gpus[0];
  const name = gpu ? gpuName(gpu.model) : "未检测到";
  const summary = [
    "GPU 负责画面渲染：桌面、视频解码、游戏画面都靠它。它有大量简单的小核心，擅长同时做成千上万次相同的计算。",
  ];
  if (gpu?.integrated) {
    summary.push(
      "这是集成显卡（核显），和 CPU 在同一个封装里。它没有独立显存，而是直接借用系统内存，所以内存速度和是否双通道会明显影响它的性能。",
    );
    if (m.memory.channels === 2) summary.push("你的内存是双通道，核显能拿到完整的内存带宽。");
    summary.push("日常使用、看视频、英雄联盟这类网游都没问题；大型 3A 游戏需要调低画质。");
  }
  return {
    title: "显卡 GPU",
    subtitle: name,
    summary,
    sections: [
      {
        title: "规格",
        rows: [
          { label: "型号", value: name },
          { label: "厂商", value: gpu?.vendor ?? "—" },
          { label: "类型", value: gpu?.integrated ? "集成显卡" : "独立显卡" },
          {
            label: "显存",
            value: gpu?.integrated ? "共享系统内存" : gpu?.vramMB ? `${gpu.vramMB} MB` : "—",
          },
          ...(live ? [{ label: "温度", value: formatTemp(live.gpuTemp), hint: tempHint(live.gpuTemp, 70, 90) }] : []),
        ],
      },
      {
        title: "正在驱动的屏幕",
        rows: m.displays.map((d) => ({
          label: d.builtin ? "内置屏" : d.connection,
          value: d.resX ? `${d.resX}×${d.resY} @ ${d.refreshHz ?? "?"}Hz` : "—",
        })),
      },
    ],
  };
}

function ramDetail(m: MachineInfo, live: LiveStats | null, index: number): PartDetail {
  const mod = m.memory.modules[index];
  const perChannelGBs = mod?.speedMTs ? (mod.speedMTs * 8) / 1000 : null;
  const channels = m.memory.channels ?? 1;
  const summary = [
    "内存是 CPU 的“工作台”：正在运行的程序和数据都放在这里，速度比硬盘快上百倍，但一断电就清空。",
  ];
  if (mod?.speedMTs && perChannelGBs) {
    summary.push(
      `${mod.type}-${mod.speedMTs} 表示每秒传输 ${mod.speedMTs} 百万次，每次 64 位（8 字节），一条内存的理论带宽约 ${perChannelGBs.toFixed(1)} GB/s。`,
    );
    if (channels === 2) {
      summary.push(
        `你插了 ${m.memory.modules.length} 条，组成双通道：CPU 可以同时从两条读写，总带宽翻倍到约 ${(perChannelGBs * 2).toFixed(1)} GB/s。`,
      );
    }
  }
  summary.push("这些参数来自内存条上的 SPD 芯片，里面记录了类型、频率和颗粒规格。");

  const used = live ? live.memory.usedBytes / live.memory.totalBytes : null;
  return {
    title: `内存 ${index + 1}`,
    subtitle: mod ? `${mod.type} ${mod.formFactor}` : "",
    summary,
    sections: [
      {
        title: "这条内存",
        rows: mod
          ? [
              { label: "插槽", value: mod.slot },
              {
                label: "容量",
                value: mod.sizeBytes ? formatMem(mod.sizeBytes) : "—",
                hint: mod.sizeEstimated ? "按总容量平均估算" : undefined,
              },
              { label: "类型", value: `${mod.type} ${mod.formFactor}` },
              { label: "速率", value: mod.speedMTs ? `${mod.speedMTs} MT/s` : "—" },
              { label: "颗粒", value: mod.dieDensityGb ? `${mod.dieDensityGb} Gb × ${mod.ioWidth ?? "?"} 位宽` : "—" },
              ...(live?.moduleTemps[index] != null
                ? [{ label: "温度", value: formatTemp(live.moduleTemps[index]) }]
                : []),
            ]
          : [],
      },
      {
        title: "整机内存",
        rows: [
          { label: "可用总量", value: formatMem(m.memory.totalBytes), hint: "少于标称容量：一部分预留给核显和固件" },
          { label: "通道", value: channels === 2 ? "双通道" : channels === 1 ? "单通道" : "未知" },
          ...(live && used !== null
            ? [
                {
                  label: "已用",
                  value: `${formatMem(live.memory.usedBytes)}（${formatPct(used * 100)}）`,
                  hint: used > 0.85 ? "偏紧张" : undefined,
                },
                { label: "交换空间已用", value: formatMem(live.memory.swapUsedBytes) },
              ]
            : []),
        ],
      },
    ],
  };
}

function ssdDetail(m: MachineInfo, live: LiveStats | null, index: number): PartDetail {
  const disk = m.disks[index];
  const summary = [
    "固态硬盘是电脑的“仓库”：系统、软件和你的文件都长期保存在这里，断电也不会丢。",
  ];
  if (disk?.type === "NVMe") {
    summary.push("NVMe 固态直接走 PCIe 通道和 CPU 通信，速度是老式 SATA 固态的好几倍。");
  }
  if (m.volumes.some((v) => v.device.startsWith("/dev/mapper/"))) {
    summary.push("你的系统分区是加密的（LUKS）。借助 CPU 的 AES 指令，加解密几乎不影响速度。");
  }
  return {
    title: "固态硬盘",
    subtitle: disk?.name ?? "",
    summary,
    sections: [
      {
        title: "规格",
        rows: disk
          ? [
              { label: "型号", value: disk.name },
              { label: "容量", value: formatDisk(disk.sizeBytes) },
              { label: "接口", value: `${disk.type} / ${disk.interface}` },
              { label: "固件", value: disk.firmware || "—" },
              ...(live ? [{ label: "温度", value: formatTemp(live.ssdTemp), hint: tempHint(live.ssdTemp, 55, 70) }] : []),
            ]
          : [],
      },
      {
        title: "分区",
        rows: m.volumes.map((v) => ({
          label: v.mounts[0],
          value: `${formatDisk(v.usedBytes)} / ${formatDisk(v.sizeBytes)}`,
          hint: `${v.fsType}${v.device.startsWith("/dev/mapper/") ? " · 加密卷" : ""}${
            v.mounts.length > 1 ? ` · 还挂载在 ${v.mounts.slice(1).join("、")}` : ""
          }`,
        })),
      },
    ],
  };
}

function batteryDetail(m: MachineInfo, live: LiveStats | null): PartDetail {
  const b = m.battery!;
  const health = b.designedCapacity ? (b.maxCapacity / b.designedCapacity) * 100 : null;
  const percent = live?.battery?.percent ?? b.percent;
  const ac = live?.battery?.acConnected ?? b.acConnected;
  const charging = live?.battery?.charging ?? b.charging;
  const summary = [
    "锂电池会随着充放电次数慢慢老化，能装下的电量越来越少。“健康度”就是现在满电容量和出厂设计容量的比值。",
  ];
  if (health !== null) {
    summary.push(
      health >= 90
        ? `你的电池健康度 ${health.toFixed(1)}%，循环 ${b.cycleCount} 次，状态很好。`
        : health >= 80
          ? `你的电池健康度 ${health.toFixed(1)}%，属于正常老化。`
          : `你的电池健康度只有 ${health.toFixed(1)}%，续航会明显缩短，可以考虑更换。`,
    );
  }
  if (ac && percent >= 95) {
    summary.push("长期插电满电会加速老化。ThinkPad 可以设置充电阈值（例如充到 80% 就停）。");
  }
  return {
    title: "电池",
    subtitle: `${b.manufacturer} ${b.model}`,
    summary,
    sections: [
      {
        title: "状态",
        rows: [
          { label: "电量", value: formatPct(percent) },
          { label: "电源", value: ac ? (charging ? "已接电源 · 充电中" : "已接电源") : "使用电池" },
          { label: "健康度", value: health !== null ? formatPct(health, 1) : "—" },
          { label: "循环次数", value: `${b.cycleCount} 次` },
        ],
      },
      {
        title: "规格",
        rows: [
          { label: "设计容量", value: `${(b.designedCapacity / 1000).toFixed(1)} Wh` },
          { label: "当前满电容量", value: `${(b.maxCapacity / 1000).toFixed(1)} Wh` },
          { label: "类型", value: b.chemistry || "—" },
          { label: "制造商", value: b.manufacturer || "—" },
        ],
      },
    ],
  };
}

function coolingDetail(live: LiveStats | null): PartDetail {
  return {
    title: "散热系统",
    subtitle: "风扇 + 热管 + 散热鳍片",
    summary: [
      "CPU 和 GPU 工作时会发热。铜质热管把热量从芯片带到散热鳍片，风扇再把热风吹出机身。",
      "负载越高，温度越高，风扇转得越快。笔记本 CPU 在 70–90°C 工作都算正常；长时间超过 95°C 会触发降频。",
    ],
    sections: [
      {
        title: "实时",
        rows: live
          ? [
              { label: "风扇转速", value: live.fanRpm ? `${live.fanRpm} RPM` : "停转" },
              { label: "CPU 封装", value: formatTemp(live.cpu.packageTemp), hint: tempHint(live.cpu.packageTemp, 70, 90) },
              { label: "GPU", value: formatTemp(live.gpuTemp), hint: tempHint(live.gpuTemp, 70, 90) },
              { label: "CPU 负载", value: formatPct(live.cpu.load) },
            ]
          : [{ label: "说明", value: "快照模式没有实时数据" }],
      },
    ],
  };
}

function wifiDetail(m: MachineInfo, live: LiveStats | null): PartDetail {
  const wifi = m.network.wifi[0];
  const iface = m.network.interfaces.find((n) => n.type === "wireless");
  const bt = m.peripherals.find((p) => /bluetooth/i.test(p.name));
  const summary = ["无线网卡负责 Wi-Fi 和蓝牙。它通过天线收发无线信号，再通过主板总线和 CPU 交换数据。"];
  if (wifi && /CNVi/i.test(wifi.model)) {
    summary.push("CNVi 表示 Wi-Fi 的一部分逻辑集成在处理器平台里，主板上那张小卡主要负责射频收发，所以更省电、成本更低。");
  }
  return {
    title: "无线网卡",
    subtitle: wifi ? `${wifi.vendor} ${wifi.model}` : "未检测到",
    summary,
    sections: [
      {
        title: "状态",
        rows: [
          { label: "Wi-Fi", value: wifi?.model ?? "—" },
          { label: "当前连接速率", value: iface?.speedMbps ? `${iface.speedMbps} Mbps` : "未连接" },
          { label: "蓝牙", value: bt?.name ?? "—" },
          ...(live ? [{ label: "温度", value: formatTemp(live.wifiTemp) }] : []),
        ],
      },
    ],
  };
}

function displayDetail(m: MachineInfo): PartDetail {
  const builtin = m.displays.find((d) => d.builtin);
  return {
    title: "屏幕",
    subtitle: builtin?.resX ? `${builtin.resX}×${builtin.resY}` : "",
    summary: [
      "屏幕由 GPU 驱动。分辨率越高，画面越细腻，但 GPU 每一帧要画的像素也越多。",
      ...(m.displays.length > 1 ? [`你现在连接了 ${m.displays.length} 块屏幕，核显同时在驱动它们。`] : []),
    ],
    sections: [
      {
        title: "已连接",
        rows: m.displays.map((d) => ({
          label: d.builtin ? `内置屏（${d.connection}）` : `外接屏（${d.connection}）`,
          value: d.resX ? `${d.resX}×${d.resY}` : "—",
          hint: d.refreshHz ? `${d.refreshHz} Hz · ${(((d.resX ?? 0) * (d.resY ?? 0)) / 1e6).toFixed(1)} 百万像素` : undefined,
        })),
      },
    ],
  };
}

function inputDetail(m: MachineInfo): PartDetail {
  return {
    title: "键盘与外设",
    subtitle: `${m.peripherals.length} 个 USB 设备`,
    summary: ["键盘、触控板、摄像头以及外接的 USB 设备，都通过主板上的 USB 控制器和系统通信。"],
    sections: [
      { title: "USB 设备", rows: m.peripherals.map((p) => ({ label: p.type, value: p.name })) },
      { title: "声卡", rows: m.audio.map((a) => ({ label: "音频", value: a })) },
    ],
  };
}

function boardDetail(m: MachineInfo): PartDetail {
  return {
    title: "主板与系统",
    subtitle: `${m.system.vendor} ${m.system.family}`,
    summary: [
      "主板是所有部件的“地基”：CPU、内存、硬盘、网卡都插在或焊在它上面，靠主板上的走线互相通信。",
      "BIOS/UEFI 是主板上的固件，开机时先由它检查硬件，再把控制权交给操作系统。",
    ],
    sections: [
      {
        title: "整机",
        rows: [
          { label: "厂商", value: m.system.vendor },
          { label: "型号", value: m.system.family || m.system.model },
          { label: "机型编号", value: m.system.model },
          { label: "类型", value: m.system.chassis },
          { label: "主板", value: m.system.board },
        ],
      },
      {
        title: "固件",
        rows: [
          { label: "BIOS 版本", value: m.system.bios.version },
          { label: "BIOS 日期", value: m.system.bios.releaseDate },
        ],
      },
      {
        title: "操作系统",
        rows: [
          { label: "发行版", value: m.os.distro },
          { label: "内核", value: m.os.kernel },
          { label: "架构", value: m.os.arch },
          { label: "主机名", value: m.os.hostname },
        ],
      },
    ],
  };
}

export function getPartDetail(id: PartId, m: MachineInfo, live: LiveStats | null): PartDetail {
  if (id.startsWith("ram-")) return ramDetail(m, live, Number(id.slice(4)));
  if (id.startsWith("ssd-")) return ssdDetail(m, live, Number(id.slice(4)));
  switch (id) {
    case "cpu":
      return cpuDetail(m, live);
    case "gpu":
      return gpuDetail(m, live);
    case "battery":
      return batteryDetail(m, live);
    case "cooling":
      return coolingDetail(live);
    case "wifi":
      return wifiDetail(m, live);
    case "display":
      return displayDetail(m);
    case "input":
      return inputDetail(m);
    default:
      return boardDetail(m);
  }
}
