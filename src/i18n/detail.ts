import type { CoreKind } from "@/types/hardware";
import type { Locale } from "./config";

const en = {
  coreKind: { P: "P-core", E: "E-core", LPE: "LP E-core" } as Record<CoreKind, string>,
  /** [name, what it buys you] per /proc/cpuinfo flag. */
  features: {
    ht: ["Hyper-Threading", "One physical core runs two threads at once"],
    vmx: ["Hardware virtualization (VT-x)", "Faster VMs, Docker and WSL2"],
    svm: ["Hardware virtualization (AMD-V)", "Faster VMs, Docker and WSL2"],
    aes: ["AES instructions", "Disk encryption costs almost nothing"],
    sha_ni: ["SHA instructions", "Hardware-accelerated hashing"],
    avx2: ["AVX2", "Vector instructions that process 256 bits at a time"],
    avx_vnni: ["AVX-VNNI", "Speeds up integer math in AI inference"],
    avx512f: ["AVX-512", "Processes 512 bits at a time"],
    fma: ["FMA", "Multiply and add in one step for faster scientific computing"],
  } as Record<string, [string, string]>,
  formFactor: { Soldered: "Soldered", Unknown: "Unknown" } as Record<string, string>,

  parts: {
    cpu: "Processor",
    gpu: "Integrated GPU",
    gpuDiscrete: "Discrete GPU",
    ram: (n: number) => `Memory ${n}`,
    ssd: "SSD",
    cooling: "Cooling",
    wifi: "Wireless card",
    battery: "Battery",
    board: "Motherboard",
    display: "Display",
    input: "Keyboard & peripherals",
  },
  temp: { hot: "Running hot", warm: "Warm, normal under load", cool: "Cool" },
  common: {
    specs: "Specs",
    live: "Live",
    status: "Status",
    model: "Model",
    vendor: "Vendor",
    type: "Type",
    temp: "Temperature",
    capacity: "Capacity",
    notDetected: "Not detected",
    unknown: "Unknown",
    fanStopped: "Stopped",
    unavailable: "N/A",
  },

  cpu: {
    title: "Processor (CPU)",
    intro: "The CPU is the computer's brain: every program's instructions are ultimately executed here.",
    pCores: (n: number) => `${n} performance cores (P-cores) handle heavy work like gaming and compiling`,
    eCores: (n: number) => `${n} efficient cores (E-cores) take background tasks`,
    lpeCores: (n: number) => `${n} low-power efficient cores (LP E-cores) cover idle and light loads`,
    hybrid: (brand: string, parts: string[]) => `This ${brand} uses a hybrid architecture: ${parts.join("; ")}.`,
    plain: (brand: string, cores: number) => `This ${brand} has ${cores} physical cores.`,
    ht: (ht: number, threads: number, cores: number) =>
      `${ht} of the P-cores support Hyper-Threading, so each works as two. That is why the system sees ${threads} threads rather than ${cores}.`,
    favored: (top: number, hi: string, lo: string) =>
      `P-cores don't all reach the same peak: ${top} "favored cores" boost to ${hi}, the rest to ${lo}. The scheduler puts the most demanding threads on the favored cores first.`,
    lpeIsland:
      "The LP E-cores sit on a separate SoC tile and aren't connected to the L3 cache. Under light load the system can run on them alone and power down the whole compute tile.",
    coresThreads: "Cores / threads",
    coresThreadsValue: (c: number, t: number) => `${c} cores, ${t} threads`,
    freqRange: "Frequency range",
    governor: "Governor",
    cacheTitle: "Cache (closer to the core = faster and smaller)",
    l1d: "L1 data",
    l1i: "L1 instruction",
    perCoreTotal: "Total across cores, private per core",
    allTotal: "Total across cores",
    shared: "Shared by all cores",
    featuresTitle: "Instruction set features",
    load: "Total load",
    avgFreq: "Current average clock",
    packageTemp: "Package temperature",
  },

  gpu: {
    title: "Graphics (GPU)",
    intro:
      "The GPU renders everything you see: the desktop, video decoding and games. It has a huge number of small, simple cores that excel at doing the same calculation thousands of times in parallel.",
    integrated:
      "This is an integrated GPU, in the same package as the CPU. It has no dedicated video memory and borrows system RAM instead, so memory speed and dual-channel mode noticeably affect its performance.",
    dualChannel: "Your memory runs in dual channel, so the iGPU gets the full memory bandwidth.",
    usage: "Everyday use, video and online games like League of Legends run fine; big AAA titles need lower settings.",
    discrete:
      "This is a discrete GPU on its own card, with dedicated video memory (VRAM). It is far more capable than the integrated GPU and handles demanding games and GPU compute; on a laptop the system switches to it only when the workload needs it, to save power.",
    integratedType: "Integrated",
    discreteType: "Discrete",
    vram: "Video memory",
    sharedVram: "Shared system memory",
    displays: "Displays being driven",
    builtin: "Built-in",
  },

  ram: {
    intro:
      "Memory is the CPU's workbench: running programs and their data live here. It is hundreds of times faster than a disk, but empties when power is lost.",
    bandwidth: (type: string, speed: number, gbs: string) =>
      `${type}-${speed} means ${speed} million transfers per second, 64 bits (8 bytes) each, so one module has about ${gbs} GB/s of theoretical bandwidth.`,
    dual: (n: number, gbs: string) =>
      `You have ${n} modules in dual channel: the CPU reads and writes both at once, doubling total bandwidth to about ${gbs} GB/s.`,
    spd: "These values come from the SPD chip on the module, which records its type, speed and DRAM chip specs.",
    thisModule: "This module",
    slot: "Slot",
    estimated: "Estimated by splitting total capacity evenly",
    speed: "Speed",
    dies: "DRAM chips",
    diesValue: (gb: number, width: number | string) => `${gb} Gb × ${width}-bit`,
    system: "System memory",
    usable: "Usable total",
    usableHint: "Less than the rated size: some is reserved for the iGPU and firmware",
    channels: "Channels",
    dualChannel: "Dual channel",
    singleChannel: "Single channel",
    used: "Used",
    usedValue: (used: string, pct: string) => `${used} (${pct})`,
    tight: "Getting tight",
    swapUsed: "Swap used",
  },

  ssd: {
    title: "SSD",
    intro: "The SSD is the computer's warehouse: the OS, apps and your files are stored here permanently, even without power.",
    nvme: "NVMe SSDs talk to the CPU directly over PCIe lanes, several times faster than older SATA SSDs.",
    luks: "Your system partition is encrypted (LUKS). Thanks to the CPU's AES instructions, encryption barely affects speed.",
    interface: "Interface",
    firmware: "Firmware",
    partitions: "Partitions",
    encrypted: " · encrypted volume",
    alsoMounted: (list: string[]) => ` · also mounted at ${list.join(", ")}`,
  },

  battery: {
    title: "Battery",
    intro:
      "Lithium batteries age with every charge cycle and hold less and less energy. \"Health\" is the ratio of today's full-charge capacity to the factory design capacity.",
    good: (h: string, cycles: number) => `Your battery health is ${h}% after ${cycles} cycles, in great shape.`,
    normal: (h: string) => `Your battery health is ${h}%, normal wear.`,
    worn: (h: string) => `Your battery health is only ${h}%. Runtime will be noticeably shorter; consider a replacement.`,
    threshold:
      "Staying plugged in at full charge speeds up aging. ThinkPads can set a charge threshold (for example, stop at 80%).",
    charge: "Charge",
    power: "Power",
    acCharging: "Plugged in · charging",
    ac: "Plugged in",
    onBattery: "On battery",
    health: "Health",
    cycles: "Cycle count",
    cyclesValue: (n: number) => `${n}`,
    design: "Design capacity",
    full: "Current full capacity",
    manufacturer: "Manufacturer",
  },

  cooling: {
    title: "Cooling system",
    subtitle: "Fan + heat pipes + fins",
    intro: [
      "The CPU and GPU heat up as they work. Copper heat pipes carry that heat from the chips to the fins, and the fan blows the hot air out of the chassis.",
      "The higher the load, the higher the temperature and the faster the fan. 70–90°C is normal for a laptop CPU; staying above 95°C for long triggers throttling.",
    ],
    fan: "Fan speed",
    cpuPackage: "CPU package",
    cpuLoad: "CPU load",
    note: "Note",
    noLive: "Snapshots have no live data",
  },

  wifi: {
    title: "Wireless card",
    intro: "The wireless card handles Wi-Fi and Bluetooth. It sends and receives radio signals through the antennas and exchanges data with the CPU over the board's bus.",
    cnvi: "CNVi means part of the Wi-Fi logic is integrated into the processor platform. The small card on the board mainly handles the radio, which saves power and cost.",
    linkSpeed: "Current link speed",
    disconnected: "Not connected",
    bluetooth: "Bluetooth",
  },

  display: {
    title: "Display",
    intro: "The display is driven by the GPU. Higher resolution looks sharper, but the GPU has more pixels to draw every frame.",
    multi: (n: number) => `You have ${n} displays connected, and the iGPU is driving all of them.`,
    connected: "Connected",
    builtin: (conn: string) => `Built-in (${conn})`,
    external: (conn: string) => `External (${conn})`,
    megapixels: (hz: number, mp: string) => `${hz} Hz · ${mp} MP`,
  },

  input: {
    title: "Keyboard & peripherals",
    subtitle: (n: number) => `${n} USB devices`,
    intro: "The keyboard, touchpad, camera and external USB devices all talk to the system through the USB controllers on the board.",
    usb: "USB devices",
    audio: "Sound cards",
    audioLabel: "Audio",
  },

  board: {
    title: "Motherboard & system",
    intro: [
      "The motherboard is the foundation: the CPU, memory, SSD and wireless card plug into or are soldered onto it, and talk to each other through its traces.",
      "BIOS/UEFI is the board's firmware. At power-on it checks the hardware first, then hands control to the operating system.",
    ],
    machine: "Machine",
    machineType: "Machine type",
    board: "Motherboard",
    firmware: "Firmware",
    biosVersion: "BIOS version",
    biosDate: "BIOS date",
    os: "Operating system",
    distro: "Distribution",
    kernel: "Kernel",
    arch: "Architecture",
    hostname: "Hostname",
  },

  insights: {
    memTight: "Memory is tight",
    memTightDetail: (free: string, pct: string) =>
      `Only ${free} (${pct}) available. Many browser tabs, an IDE or dev servers can easily make things sluggish.`,
    swap: "Heavy swap usage",
    swapDetail: (used: string) =>
      `${used} of data has been pushed to swap. Swap is much slower than RAM, which usually means physical memory is running short.`,
    cpuHot: "CPU overheating",
    cpuHotDetail: (t: number) => `Package temperature is ${t}°C and may trigger throttling. Check that the vents aren't blocked.`,
    cpuWarm: "CPU running warm",
    cpuWarmDetail: (t: number) => `Package temperature is ${t}°C. Still safe, but the load is significant.`,
    dual: "Dual-channel memory",
    dualDetail: (n: number, type: string) =>
      `${n} ${type} modules run in dual channel, doubling memory bandwidth. This matters especially for the iGPU.`,
    single: "Single-channel memory",
    singleDetail:
      "Only one memory module, so iGPU performance is noticeably limited. Adding a matching module for dual channel will raise frame rates considerably.",
    batteryOk: "Battery healthy",
    batteryWorn: "Battery worn",
    batteryDetail: (h: string, cycles: number) => `Health ${h}% after ${cycles} cycles.`,
    diskFull: (mount: string) => `${mount} is running out of space`,
    diskFullDetail: (pct: string) => `${pct} used. SSDs slow down when they get too full.`,
  },
};

export type DetailText = typeof en;

const zh: DetailText = {
  coreKind: { P: "性能核", E: "能效核", LPE: "低功耗能效核" },
  features: {
    ht: ["超线程", "一个物理核同时跑两个线程"],
    vmx: ["硬件虚拟化（VT-x）", "虚拟机、Docker、WSL2 更快"],
    svm: ["硬件虚拟化（AMD-V）", "虚拟机、Docker、WSL2 更快"],
    aes: ["AES 加密指令", "磁盘加密几乎不耗性能"],
    sha_ni: ["SHA 指令", "哈希计算硬件加速"],
    avx2: ["AVX2", "一次处理 256 位数据的向量指令"],
    avx_vnni: ["AVX-VNNI", "加速 AI 推理中的整数运算"],
    avx512f: ["AVX-512", "一次处理 512 位数据"],
    fma: ["FMA", "乘法和加法一步完成，科学计算更快"],
  },
  formFactor: { Soldered: "板载焊接", Unknown: "未知" },

  parts: {
    cpu: "处理器",
    gpu: "核显",
    gpuDiscrete: "独显",
    ram: (n) => `内存 ${n}`,
    ssd: "固态硬盘",
    cooling: "散热",
    wifi: "无线网卡",
    battery: "电池",
    board: "主板",
    display: "屏幕",
    input: "键盘与外设",
  },
  temp: { hot: "偏热", warm: "温热，正常负载范围", cool: "凉爽" },
  common: {
    specs: "规格",
    live: "实时",
    status: "状态",
    model: "型号",
    vendor: "厂商",
    type: "类型",
    temp: "温度",
    capacity: "容量",
    notDetected: "未检测到",
    unknown: "未知",
    fanStopped: "停转",
    unavailable: "不可用",
  },

  cpu: {
    title: "处理器 CPU",
    intro: "CPU 是电脑的“大脑”，所有程序的指令最终都由它执行。",
    pCores: (n) => `${n} 个性能核（P 核）负责游戏、编译这类重活`,
    eCores: (n) => `${n} 个能效核（E 核）处理后台任务`,
    lpeCores: (n) => `${n} 个低功耗能效核（LP-E 核）负责待机和轻负载`,
    hybrid: (brand, parts) => `这颗 ${brand} 采用大小核混合架构：${parts.join("；")}。`,
    plain: (brand, cores) => `这颗 ${brand} 有 ${cores} 个物理核心。`,
    ht: (ht, threads, cores) =>
      `其中 ${ht} 个 P 核支持超线程，一个核当两个用，所以系统里看到的是 ${threads} 个线程，而不是 ${cores} 个。`,
    favored: (top, hi, lo) =>
      `P 核的最高频率并不一样：${top} 个“偏好核”能冲到 ${hi}，其余是 ${lo}。系统会优先把最吃性能的线程放到偏好核上。`,
    lpeIsland: "LP-E 核位于封装里单独的 SoC 模块上，不接入 L3 缓存。只做轻活时，系统可以只用它们，让整个计算模块断电省电。",
    coresThreads: "核心 / 线程",
    coresThreadsValue: (c, t) => `${c} 核 ${t} 线程`,
    freqRange: "频率范围",
    governor: "调频策略",
    cacheTitle: "缓存（越靠近核心越快、越小）",
    l1d: "L1 数据",
    l1i: "L1 指令",
    perCoreTotal: "所有核合计，每核私有",
    allTotal: "所有核合计",
    shared: "全部核心共享",
    featuresTitle: "指令集特性",
    load: "总负载",
    avgFreq: "当前平均频率",
    packageTemp: "封装温度",
  },

  gpu: {
    title: "显卡 GPU",
    intro: "GPU 负责画面渲染：桌面、视频解码、游戏画面都靠它。它有大量简单的小核心，擅长同时做成千上万次相同的计算。",
    integrated:
      "这是集成显卡（核显），和 CPU 在同一个封装里。它没有独立显存，而是直接借用系统内存，所以内存速度和是否双通道会明显影响它的性能。",
    dualChannel: "你的内存是双通道，核显能拿到完整的内存带宽。",
    usage: "日常使用、看视频、英雄联盟这类网游都没问题；大型 3A 游戏需要调低画质。",
    discrete:
      "这是独立显卡，有单独的显卡芯片和专用显存（VRAM）。性能远强于核显，能跑大型游戏和 GPU 计算；笔记本上系统只在需要时才切到它，以节省电量。",
    integratedType: "集成显卡",
    discreteType: "独立显卡",
    vram: "显存",
    sharedVram: "共享系统内存",
    displays: "正在驱动的屏幕",
    builtin: "内置屏",
  },

  ram: {
    intro: "内存是 CPU 的“工作台”：正在运行的程序和数据都放在这里，速度比硬盘快上百倍，但一断电就清空。",
    bandwidth: (type, speed, gbs) =>
      `${type}-${speed} 表示每秒传输 ${speed} 百万次，每次 64 位（8 字节），一条内存的理论带宽约 ${gbs} GB/s。`,
    dual: (n, gbs) => `你插了 ${n} 条，组成双通道：CPU 可以同时从两条读写，总带宽翻倍到约 ${gbs} GB/s。`,
    spd: "这些参数来自内存条上的 SPD 芯片，里面记录了类型、频率和颗粒规格。",
    thisModule: "这条内存",
    slot: "插槽",
    estimated: "按总容量平均估算",
    speed: "速率",
    dies: "颗粒",
    diesValue: (gb, width) => `${gb} Gb × ${width} 位宽`,
    system: "整机内存",
    usable: "可用总量",
    usableHint: "少于标称容量：一部分预留给核显和固件",
    channels: "通道",
    dualChannel: "双通道",
    singleChannel: "单通道",
    used: "已用",
    usedValue: (used, pct) => `${used}（${pct}）`,
    tight: "偏紧张",
    swapUsed: "交换空间已用",
  },

  ssd: {
    title: "固态硬盘",
    intro: "固态硬盘是电脑的“仓库”：系统、软件和你的文件都长期保存在这里，断电也不会丢。",
    nvme: "NVMe 固态直接走 PCIe 通道和 CPU 通信，速度是老式 SATA 固态的好几倍。",
    luks: "你的系统分区是加密的（LUKS）。借助 CPU 的 AES 指令，加解密几乎不影响速度。",
    interface: "接口",
    firmware: "固件",
    partitions: "分区",
    encrypted: " · 加密卷",
    alsoMounted: (list) => ` · 还挂载在 ${list.join("、")}`,
  },

  battery: {
    title: "电池",
    intro: "锂电池会随着充放电次数慢慢老化，能装下的电量越来越少。“健康度”就是现在满电容量和出厂设计容量的比值。",
    good: (h, cycles) => `你的电池健康度 ${h}%，循环 ${cycles} 次，状态很好。`,
    normal: (h) => `你的电池健康度 ${h}%，属于正常老化。`,
    worn: (h) => `你的电池健康度只有 ${h}%，续航会明显缩短，可以考虑更换。`,
    threshold: "长期插电满电会加速老化。ThinkPad 可以设置充电阈值（例如充到 80% 就停）。",
    charge: "电量",
    power: "电源",
    acCharging: "已接电源 · 充电中",
    ac: "已接电源",
    onBattery: "使用电池",
    health: "健康度",
    cycles: "循环次数",
    cyclesValue: (n) => `${n} 次`,
    design: "设计容量",
    full: "当前满电容量",
    manufacturer: "制造商",
  },

  cooling: {
    title: "散热系统",
    subtitle: "风扇 + 热管 + 散热鳍片",
    intro: [
      "CPU 和 GPU 工作时会发热。铜质热管把热量从芯片带到散热鳍片，风扇再把热风吹出机身。",
      "负载越高，温度越高，风扇转得越快。笔记本 CPU 在 70–90°C 工作都算正常；长时间超过 95°C 会触发降频。",
    ],
    fan: "风扇转速",
    cpuPackage: "CPU 封装",
    cpuLoad: "CPU 负载",
    note: "说明",
    noLive: "快照模式没有实时数据",
  },

  wifi: {
    title: "无线网卡",
    intro: "无线网卡负责 Wi-Fi 和蓝牙。它通过天线收发无线信号，再通过主板总线和 CPU 交换数据。",
    cnvi: "CNVi 表示 Wi-Fi 的一部分逻辑集成在处理器平台里，主板上那张小卡主要负责射频收发，所以更省电、成本更低。",
    linkSpeed: "当前连接速率",
    disconnected: "未连接",
    bluetooth: "蓝牙",
  },

  display: {
    title: "屏幕",
    intro: "屏幕由 GPU 驱动。分辨率越高，画面越细腻，但 GPU 每一帧要画的像素也越多。",
    multi: (n) => `你现在连接了 ${n} 块屏幕，核显同时在驱动它们。`,
    connected: "已连接",
    builtin: (conn) => `内置屏（${conn}）`,
    external: (conn) => `外接屏（${conn}）`,
    megapixels: (hz, mp) => `${hz} Hz · ${mp} 百万像素`,
  },

  input: {
    title: "键盘与外设",
    subtitle: (n) => `${n} 个 USB 设备`,
    intro: "键盘、触控板、摄像头以及外接的 USB 设备，都通过主板上的 USB 控制器和系统通信。",
    usb: "USB 设备",
    audio: "声卡",
    audioLabel: "音频",
  },

  board: {
    title: "主板与系统",
    intro: [
      "主板是所有部件的“地基”：CPU、内存、硬盘、网卡都插在或焊在它上面，靠主板上的走线互相通信。",
      "BIOS/UEFI 是主板上的固件，开机时先由它检查硬件，再把控制权交给操作系统。",
    ],
    machine: "整机",
    machineType: "机型编号",
    board: "主板",
    firmware: "固件",
    biosVersion: "BIOS 版本",
    biosDate: "BIOS 日期",
    os: "操作系统",
    distro: "发行版",
    kernel: "内核",
    arch: "架构",
    hostname: "主机名",
  },

  insights: {
    memTight: "内存紧张",
    memTightDetail: (free, pct) => `只剩 ${free}（${pct}）可用。多开浏览器标签页、IDE 或开发服务器时容易变卡。`,
    swap: "大量使用交换空间",
    swapDetail: (used) => `已有 ${used} 数据被挤到交换空间。交换空间比内存慢得多，这通常说明物理内存不够用。`,
    cpuHot: "CPU 过热",
    cpuHotDetail: (t) => `封装温度 ${t}°C，可能触发降频。检查出风口是否被挡住。`,
    cpuWarm: "CPU 温度偏高",
    cpuWarmDetail: (t) => `封装温度 ${t}°C，还在安全范围内，但说明负载不低。`,
    dual: "双通道内存",
    dualDetail: (n, type) => `${n} 条 ${type} 组成双通道，内存带宽翻倍，对核显性能尤其重要。`,
    single: "单通道内存",
    singleDetail: "只有一条内存，核显性能会明显受限。加一条同规格内存组成双通道，游戏帧数能提升不少。",
    batteryOk: "电池健康",
    batteryWorn: "电池老化",
    batteryDetail: (h, cycles) => `健康度 ${h}%，循环 ${cycles} 次。`,
    diskFull: (mount) => `${mount} 空间不足`,
    diskFullDetail: (pct) => `已用 ${pct}。固态硬盘太满会变慢。`,
  },
};

const DETAIL: Record<Locale, DetailText> = { en, zh };

export function detailText(locale: Locale): DetailText {
  return DETAIL[locale];
}

/** Collectors emit English tokens; older snapshots may still carry the Chinese ones. */
const LEGACY_FORM: Record<string, string> = { 板载焊接: "Soldered", 未知: "Unknown" };

export function formFactorText(t: DetailText, raw: string): string {
  const key = LEGACY_FORM[raw] ?? raw;
  return t.formFactor[key] ?? raw;
}
