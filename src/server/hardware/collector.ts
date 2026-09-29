import type { MemoryModule, PhysicalCore } from "@/types/hardware";

/** One hwmon-style sensor device, normalised across platforms. */
export interface HwmonDevice {
  name: string;
  temps: { label: string; celsius: number }[];
  fans: number[];
}

/**
 * The contract every platform collector implements. Any path a platform cannot
 * read must return an empty result (not throw), so the callers fall back to the
 * systeminformation baseline instead of guessing.
 *
 * Platform modules depend only on this contract, never on each other.
 */
export interface HardwareCollector {
  readCpuTopology(): Promise<PhysicalCore[]>;
  readMemoryModules(): Promise<MemoryModule[]>;
  readHwmon(): Promise<HwmonDevice[]>;
  readModuleTemps(): Promise<number[]>;
}
