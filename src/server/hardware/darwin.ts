import type { MemoryModule, PhysicalCore } from "@/types/hardware";
import type { HwmonDevice } from "./collector";

/**
 * macOS has no sysfs/hwmon and does not expose SPD or per-core efficiency class
 * to user space. Everything falls back to the systeminformation baseline in
 * machine.ts / live.ts. Left as explicit stubs so a contributor can layer on
 * IOKit/powermetrics readers later without touching the dispatcher.
 */
export async function readCpuTopology(): Promise<PhysicalCore[]> {
  return [];
}

export async function readMemoryModules(): Promise<MemoryModule[]> {
  return [];
}

export async function readHwmon(): Promise<HwmonDevice[]> {
  return [];
}

export async function readModuleTemps(): Promise<number[]> {
  return [];
}
