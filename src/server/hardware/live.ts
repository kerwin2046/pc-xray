import si from "systeminformation";
import type { LiveStats } from "@/types/hardware";
import { readHwmon, readModuleTemps } from "./linux";

export async function getLiveStats(): Promise<LiveStats> {
  const [load, mem, speed, battery, hwmon, moduleTemps] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuCurrentSpeed(),
    si.battery(),
    readHwmon(),
    readModuleTemps(),
  ]);

  let packageTemp: number | null = null;
  const coreTemps: Record<number, number> = {};
  let gpuTemp: number | null = null;
  let ssdTemp: number | null = null;
  let wifiTemp: number | null = null;
  let fanRpm: number | null = null;

  for (const dev of hwmon) {
    for (const t of dev.temps) {
      if (dev.name === "coretemp") {
        if (/^Package id/.test(t.label)) packageTemp ??= t.celsius;
        const core = /^Core (\d+)$/.exec(t.label);
        if (core) coreTemps[Number(core[1])] = t.celsius;
      } else if (dev.name === "k10temp" && /^Tctl|^Tdie/.test(t.label)) {
        packageTemp ??= t.celsius;
      } else if (/^GPU$/i.test(t.label) || (dev.name === "amdgpu" && t.label === "edge")) {
        gpuTemp ??= t.celsius;
      } else if (dev.name === "nvme" && t.label === "Composite") {
        ssdTemp ??= t.celsius;
      } else if (dev.name.startsWith("iwlwifi")) {
        wifiTemp ??= t.celsius;
      }
    }
    const fan = dev.fans.find((rpm) => rpm > 0);
    if (fan !== undefined && fanRpm === null) fanRpm = fan;
  }

  return {
    t: Date.now(),
    cpu: {
      load: load.currentLoad,
      perCpu: load.cpus.map((c) => c.load),
      speedGHz: speed.avg || null,
      packageTemp,
      coreTemps,
    },
    gpuTemp,
    memory: {
      usedBytes: mem.total - mem.available,
      availableBytes: mem.available,
      totalBytes: mem.total,
      swapUsedBytes: mem.swapused,
    },
    moduleTemps,
    ssdTemp,
    wifiTemp,
    fanRpm,
    battery: battery.hasBattery
      ? { percent: battery.percent, charging: battery.isCharging, acConnected: battery.acConnected }
      : null,
  };
}
