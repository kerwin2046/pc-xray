import { open, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import type { CoreKind, MemoryModule, PhysicalCore } from "@/types/hardware";

async function readText(file: string): Promise<string | null> {
  try {
    return (await readFile(file, "utf8")).trim();
  } catch {
    return null;
  }
}

async function readNumber(file: string): Promise<number | null> {
  const text = await readText(file);
  if (text === null || text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

function parseCpuList(list: string): number[] {
  const out: number[] = [];
  for (const part of list.split(",")) {
    if (!part) continue;
    const [a, b] = part.split("-").map(Number);
    if (b === undefined) out.push(a);
    else for (let i = a; i <= b; i++) out.push(i);
  }
  return out;
}

const CPU_ROOT = "/sys/devices/system/cpu";

export async function readCpuTopology(): Promise<PhysicalCore[]> {
  const entries = (await listDir(CPU_ROOT)).filter((e) => /^cpu\d+$/.test(e));
  if (entries.length === 0) return [];

  // Hybrid Intel CPUs list their efficiency cores here; LP-E cores sit outside the L3 domain.
  const atomText = await readText("/sys/devices/cpu_atom/cpus");
  const atomCpus = new Set(atomText ? parseCpuList(atomText) : []);

  const groups = new Map<string, PhysicalCore>();
  for (const entry of entries) {
    const idx = Number(entry.slice(3));
    const base = path.join(CPU_ROOT, entry);
    const coreId = (await readNumber(`${base}/topology/core_id`)) ?? idx;
    const pkg = (await readNumber(`${base}/topology/physical_package_id`)) ?? 0;
    const maxKHz = (await readNumber(`${base}/cpufreq/cpuinfo_max_freq`)) ?? 0;
    const l3 = await readText(`${base}/cache/index3/shared_cpu_list`);

    let kind: CoreKind = "P";
    if (atomCpus.has(idx)) kind = l3 ? "E" : "LPE";

    const key = `${pkg}-${coreId}`;
    const existing = groups.get(key);
    if (existing) existing.cpus.push(idx);
    else groups.set(key, { kind, coreId, maxMHz: Math.round(maxKHz / 1000), cpus: [idx] });
  }

  const order: Record<CoreKind, number> = { P: 0, E: 1, LPE: 2 };
  return [...groups.values()]
    .map((c) => ({ ...c, cpus: c.cpus.sort((a, b) => a - b) }))
    .sort((a, b) => order[a.kind] - order[b.kind] || b.maxMHz - a.maxMHz || a.coreId - b.coreId);
}

export interface HwmonDevice {
  name: string;
  temps: { label: string; celsius: number }[];
  fans: number[];
}

export async function readHwmon(): Promise<HwmonDevice[]> {
  const root = "/sys/class/hwmon";
  const entries = (await listDir(root)).sort(
    (a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")),
  );
  const devices: HwmonDevice[] = [];
  for (const entry of entries) {
    const dir = path.join(root, entry);
    const name = (await readText(`${dir}/name`)) ?? entry;
    const temps: HwmonDevice["temps"] = [];
    const fans: number[] = [];
    for (const f of await listDir(dir)) {
      const m = /^(temp|fan)(\d+)_input$/.exec(f);
      if (!m) continue;
      const value = await readNumber(`${dir}/${f}`);
      if (value === null) continue;
      if (m[1] === "fan") {
        fans.push(value);
      } else {
        const label = (await readText(`${dir}/temp${m[2]}_label`)) ?? `temp${m[2]}`;
        temps.push({ label, celsius: value / 1000 });
      }
    }
    devices.push({ name, temps, fans });
  }
  return devices;
}

/** hwmon entries for SPD hubs, ordered the same way as readMemoryModules(). */
export async function readModuleTemps(): Promise<number[]> {
  const out: number[] = [];
  for (const driver of ["spd5118", "ee1004"]) {
    const dir = `/sys/bus/i2c/drivers/${driver}`;
    for (const dev of (await listDir(dir)).filter(isSpdDevice).sort()) {
      const hwmonDir = path.join(dir, dev, "hwmon");
      const [first] = await listDir(hwmonDir);
      if (!first) continue;
      const milli = await readNumber(path.join(hwmonDir, first, "temp1_input"));
      if (milli !== null) out.push(milli / 1000);
    }
  }
  return out;
}

const STANDARD_SPEEDS = [
  1600, 1866, 2133, 2400, 2666, 2933, 3200, 3600, 4000, 4266, 4800, 5200, 5600, 6000, 6400, 6800,
  7200, 7500, 8000, 8400, 8533, 8800,
];

function snapSpeed(raw: number): number {
  return STANDARD_SPEEDS.reduce((best, s) => (Math.abs(s - raw) < Math.abs(best - raw) ? s : best));
}

const DDR5_DENSITY_GB: Record<number, number> = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 };
const DDR4_DENSITY_GB: Record<number, number> = { 4: 4, 5: 8, 6: 16, 7: 32 };
const MODULE_FORM: Record<number, string> = {
  1: "RDIMM",
  2: "UDIMM",
  3: "SO-DIMM",
  4: "LRDIMM",
  11: "Soldered",
};

/** Decodes the leading bytes of a JEDEC SPD EEPROM (DDR4 / DDR5). */
export function decodeSpd(bytes: Uint8Array, slot: string): MemoryModule | null {
  const dramType = bytes[2];
  const formFactor = MODULE_FORM[bytes[3] & 0x0f] ?? "Unknown";

  if (dramType === 0x12 || dramType === 0x13) {
    const tckPs = bytes[20] | (bytes[21] << 8);
    return {
      slot,
      sizeBytes: null,
      sizeEstimated: false,
      type: dramType === 0x12 ? "DDR5" : "LPDDR5",
      formFactor,
      speedMTs: tckPs > 0 ? snapSpeed(2e6 / tckPs) : null,
      dieDensityGb: DDR5_DENSITY_GB[bytes[4] & 0x1f] ?? null,
      ioWidth: 4 << ((bytes[6] >> 5) & 0x07),
    };
  }

  if (dramType === 0x0c) {
    const fine = bytes[125] > 127 ? bytes[125] - 256 : bytes[125];
    const tckPs = bytes[18] * 125 + fine;
    return {
      slot,
      sizeBytes: null,
      sizeEstimated: false,
      type: "DDR4",
      formFactor,
      speedMTs: tckPs > 0 ? snapSpeed(2e6 / tckPs) : null,
      dieDensityGb: DDR4_DENSITY_GB[bytes[4] & 0x0f] ?? null,
      ioWidth: 4 << (bytes[12] & 0x07),
    };
  }

  return null;
}

function isSpdDevice(name: string) {
  return /^\d+-005[0-7]$/.test(name);
}

/** Reads SPD data exposed (world-readable) by the spd5118 / ee1004 kernel drivers. */
export async function readMemoryModules(): Promise<MemoryModule[]> {
  const modules: MemoryModule[] = [];
  for (const driver of ["spd5118", "ee1004"]) {
    const dir = `/sys/bus/i2c/drivers/${driver}`;
    for (const dev of (await listDir(dir)).filter(isSpdDevice).sort()) {
      try {
        const handle = await open(await realpath(path.join(dir, dev, "eeprom")), "r");
        const buf = new Uint8Array(128);
        await handle.read(buf, 0, 128, 0);
        await handle.close();
        const decoded = decodeSpd(buf, `DIMM ${modules.length}`);
        if (decoded) modules.push(decoded);
      } catch {}
    }
  }
  return modules;
}
