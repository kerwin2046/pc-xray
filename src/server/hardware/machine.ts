import si from "systeminformation";
import type { MachineInfo, MemoryModule, PhysicalCore } from "@/types/hardware";
import { readCpuTopology, readMemoryModules } from "./linux";

const GIB = 1024 ** 3;
const COMMON_MODULE_GIB = [2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128];
const FEATURE_FLAGS = ["ht", "vmx", "svm", "aes", "sha_ni", "avx2", "avx_vnni", "avx512f", "fma"];
const VIRTUAL_IFACE = /^(lo|veth|br-|docker|virbr|tun|tap|vnet|Meta|utun|zt)/;

/** Usable RAM is below the installed amount (firmware / iGPU reservations), so round up. */
function estimateModuleBytes(totalBytes: number, count: number): number {
  const raw = totalBytes / count / GIB;
  const gib = COMMON_MODULE_GIB.find((g) => g >= raw * 0.95) ?? Math.ceil(raw);
  return gib * GIB;
}

function fallbackCores(cpu: si.Systeminformation.CpuData): PhysicalCore[] {
  const p = cpu.performanceCores || cpu.physicalCores;
  const e = cpu.efficiencyCores || 0;
  const htOnP = Math.max(0, cpu.cores - cpu.physicalCores);
  const cores: PhysicalCore[] = [];
  let logical = 0;
  for (let i = 0; i < p; i++) {
    const cpus = i < htOnP ? [logical++, logical++] : [logical++];
    cores.push({ kind: "P", coreId: i, maxMHz: Math.round(cpu.speedMax * 1000), cpus });
  }
  for (let i = 0; i < e; i++) {
    cores.push({ kind: "E", coreId: p + i, maxMHz: 0, cpus: [logical++] });
  }
  return cores;
}

async function collect(): Promise<MachineInfo> {
  const data = await si.get({
    cpu: "*",
    mem: "total,swaptotal",
    memLayout: "*",
    graphics: "*",
    diskLayout: "device,type,name,size,interfaceType,firmwareRevision",
    fsSize: "fs,type,size,used,mount",
    battery: "*",
    system: "manufacturer,model,version,virtual",
    baseboard: "manufacturer,model,version",
    bios: "vendor,version,releaseDate",
    chassis: "type",
    osInfo: "distro,release,kernel,arch,hostname",
    networkInterfaces: "iface,type,speed,virtual",
    wifiInterfaces: "model,vendor",
    usb: "name,type",
    audio: "name,manufacturer",
  });

  const cpu = data.cpu as si.Systeminformation.CpuData;
  const topology = await readCpuTopology();
  const cores = topology.length > 0 ? topology : fallbackCores(cpu);

  const mem = data.mem as si.Systeminformation.MemData;
  let modules: MemoryModule[] = await readMemoryModules();
  if (modules.length > 0) {
    const each = estimateModuleBytes(mem.total, modules.length);
    modules = modules.map((m) => ({ ...m, sizeBytes: each, sizeEstimated: true }));
  } else {
    const layout = (data.memLayout as si.Systeminformation.MemLayoutData[]).filter((m) => m.size > 0);
    modules = layout.map((m, i) => ({
      slot: m.bank || `DIMM ${i}`,
      sizeBytes: m.size,
      sizeEstimated: !m.type,
      type: m.type || "Unknown",
      formFactor: m.formFactor || "Unknown",
      speedMTs: m.clockSpeed || null,
      dieDensityGb: null,
      ioWidth: null,
    }));
  }

  const graphics = data.graphics as si.Systeminformation.GraphicsData;
  const battery = data.battery as si.Systeminformation.BatteryData;
  const system = data.system as si.Systeminformation.SystemData;
  const baseboard = data.baseboard as si.Systeminformation.BaseboardData;
  const bios = data.bios as si.Systeminformation.BiosData;
  const os = data.osInfo as si.Systeminformation.OsData;

  const volumes = new Map<string, MachineInfo["volumes"][number]>();
  for (const fs of data.fsSize as si.Systeminformation.FsSizeData[]) {
    if (!fs.fs.startsWith("/dev/")) continue;
    const existing = volumes.get(fs.fs);
    if (existing) existing.mounts.push(fs.mount);
    else
      volumes.set(fs.fs, {
        device: fs.fs,
        fsType: fs.type,
        mounts: [fs.mount],
        sizeBytes: fs.size,
        usedBytes: fs.used,
      });
  }

  const flags = new Set(cpu.flags.split(/\s+/));

  return {
    collectedAt: new Date().toISOString(),
    platform: process.platform,
    system: {
      vendor: system.manufacturer,
      model: system.model,
      family: system.version,
      chassis: (data.chassis as si.Systeminformation.ChassisData).type,
      bios: { vendor: bios.vendor, version: bios.version.trim(), releaseDate: bios.releaseDate },
      board: [baseboard.manufacturer, baseboard.model, baseboard.version].filter(Boolean).join(" "),
    },
    os: { distro: os.distro, kernel: os.kernel, arch: os.arch, hostname: os.hostname },
    cpu: {
      brand: `${cpu.manufacturer} ${cpu.brand}`.replace(/™|®/g, ""),
      vendor: cpu.vendor,
      threads: cpu.cores,
      physicalCores: cpu.physicalCores,
      pCores: cores.filter((c) => c.kind === "P").length,
      eCores: cores.filter((c) => c.kind === "E").length,
      lpeCores: cores.filter((c) => c.kind === "LPE").length,
      speedMinGHz: cpu.speedMin,
      speedMaxGHz: cpu.speedMax,
      governor: cpu.governor,
      virtualization: cpu.virtualization,
      cache: cpu.cache,
      cores,
      features: FEATURE_FLAGS.filter((f) => flags.has(f)),
    },
    memory: {
      totalBytes: mem.total,
      swapTotalBytes: mem.swaptotal,
      modules,
      channels: modules.length >= 2 ? 2 : modules.length === 1 ? 1 : null,
    },
    gpus: graphics.controllers.map((g) => ({
      vendor: g.vendor,
      model: g.model,
      vramMB: g.vram ?? null,
      integrated: g.bus === "Onboard" || /graphics|uhd|iris|radeon\(tm\) graphics/i.test(g.model),
    })),
    displays: graphics.displays.map((d) => ({
      connection: d.connection ?? "",
      builtin: d.builtin,
      resX: d.currentResX ?? d.resolutionX,
      resY: d.currentResY ?? d.resolutionY,
      refreshHz: d.currentRefreshRate ?? null,
    })),
    disks: (data.diskLayout as si.Systeminformation.DiskLayoutData[])
      // macOS reports mounted disk images (DMGs, simulator volumes) here; they are not physical drives.
      .filter((d) => d.type !== "Disk Image")
      .map((d) => ({
        name: d.name,
        type: d.type,
        interface: d.interfaceType,
        sizeBytes: d.size,
        firmware: d.firmwareRevision,
      })),
    volumes: [...volumes.values()],
    battery: battery.hasBattery
      ? {
          model: battery.model,
          manufacturer: battery.manufacturer,
          chemistry: battery.type,
          designedCapacity: battery.designedCapacity,
          maxCapacity: battery.maxCapacity,
          capacityUnit: battery.capacityUnit,
          cycleCount: battery.cycleCount,
          percent: battery.percent,
          charging: battery.isCharging,
          acConnected: battery.acConnected,
        }
      : null,
    network: {
      wifi: (data.wifiInterfaces as si.Systeminformation.WifiInterfaceData[]).map((w) => ({
        model: w.model,
        vendor: w.vendor,
      })),
      interfaces: (data.networkInterfaces as si.Systeminformation.NetworkInterfacesData[])
        .filter((n) => !n.virtual && !VIRTUAL_IFACE.test(n.iface))
        .map((n) => ({ name: n.iface, type: n.type, speedMbps: n.speed ?? null })),
    },
    peripherals: (data.usb as si.Systeminformation.UsbData[])
      .filter((u) => u.type !== "Hub")
      .map((u) => ({ name: u.name, type: u.type })),
    audio: (data.audio as si.Systeminformation.AudioData[]).map((a) =>
      [a.manufacturer, a.name].filter(Boolean).join(" "),
    ),
  };
}

let cache: { at: number; value: Promise<MachineInfo> } | null = null;

export function getMachineInfo(): Promise<MachineInfo> {
  if (!cache || Date.now() - cache.at > 60_000) {
    const value = collect();
    cache = { at: Date.now(), value };
    value.catch(() => (cache = null));
  }
  return cache.value;
}
