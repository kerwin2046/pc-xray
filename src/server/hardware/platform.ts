import type { HardwareCollector } from "./collector";
import * as linux from "./linux";
import * as windows from "./windows";
import * as darwin from "./darwin";

export type { HwmonDevice } from "./collector";

/**
 * Selects the collector for the current platform. Each platform module
 * satisfies the HardwareCollector contract; the annotation below fails the
 * build if any of them drifts from it. Add a platform by dropping in a module
 * with the same contract and adding it to this switch.
 */
const impl: HardwareCollector =
  process.platform === "win32" ? windows : process.platform === "darwin" ? darwin : linux;

export const { readCpuTopology, readMemoryModules, readHwmon, readModuleTemps } = impl;
