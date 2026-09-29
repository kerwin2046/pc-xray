export type CoreKind = "P" | "E" | "LPE";

export interface PhysicalCore {
  kind: CoreKind;
  coreId: number;
  maxMHz: number;
  /** Logical CPU indices (hyper-threads) backed by this physical core. */
  cpus: number[];
}

export interface MemoryModule {
  slot: string;
  sizeBytes: number | null;
  /** True when size is total memory split evenly, because SPD rank info was unreadable. */
  sizeEstimated: boolean;
  type: string;
  formFactor: string;
  speedMTs: number | null;
  dieDensityGb: number | null;
  ioWidth: number | null;
}

export interface MachineInfo {
  collectedAt: string;
  platform: string;
  system: {
    vendor: string;
    model: string;
    family: string;
    chassis: string;
    bios: { vendor: string; version: string; releaseDate: string };
    board: string;
  };
  os: { distro: string; kernel: string; arch: string; hostname: string };
  cpu: {
    brand: string;
    vendor: string;
    threads: number;
    physicalCores: number;
    pCores: number;
    eCores: number;
    lpeCores: number;
    speedMinGHz: number;
    speedMaxGHz: number;
    governor: string;
    virtualization: boolean;
    cache: { l1d: number; l1i: number; l2: number; l3: number };
    cores: PhysicalCore[];
    features: string[];
  };
  memory: {
    totalBytes: number;
    swapTotalBytes: number;
    modules: MemoryModule[];
    channels: number | null;
  };
  gpus: { vendor: string; model: string; vramMB: number | null; integrated: boolean }[];
  displays: {
    connection: string;
    builtin: boolean;
    resX: number | null;
    resY: number | null;
    refreshHz: number | null;
  }[];
  disks: {
    name: string;
    type: string;
    interface: string;
    sizeBytes: number;
    firmware: string;
  }[];
  volumes: {
    device: string;
    fsType: string;
    mounts: string[];
    sizeBytes: number;
    usedBytes: number;
  }[];
  battery: {
    model: string;
    manufacturer: string;
    chemistry: string;
    designedCapacity: number;
    maxCapacity: number;
    capacityUnit: string;
    cycleCount: number;
    percent: number;
    charging: boolean;
    acConnected: boolean;
  } | null;
  network: {
    wifi: { model: string; vendor: string }[];
    interfaces: { name: string; type: string; speedMbps: number | null }[];
  };
  peripherals: { name: string; type: string }[];
  audio: string[];
}

export interface LiveStats {
  t: number;
  cpu: {
    load: number;
    /** Load per logical CPU, 0-100. */
    perCpu: number[];
    speedGHz: number | null;
    packageTemp: number | null;
    /** Temperature keyed by physical core id. */
    coreTemps: Record<number, number>;
  };
  gpuTemp: number | null;
  memory: { usedBytes: number; availableBytes: number; totalBytes: number; swapUsedBytes: number };
  moduleTemps: number[];
  ssdTemp: number | null;
  wifiTemp: number | null;
  fanRpm: number | null;
  battery: { percent: number; charging: boolean; acConnected: boolean } | null;
}
