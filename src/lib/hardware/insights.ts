import type { LiveStats, MachineInfo } from "@/types/hardware";
import type { PartId } from "@/lib/hardware/parts";
import { formatMem, formatPct } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { detailText } from "@/i18n/detail";

export type InsightLevel = "ok" | "info" | "warn" | "danger";

export interface Insight {
  level: InsightLevel;
  title: string;
  detail: string;
  part?: PartId;
}

export function getInsights(m: MachineInfo, live: LiveStats | null, locale: Locale): Insight[] {
  const t = detailText(locale).insights;
  const out: Insight[] = [];

  if (live) {
    const avail = live.memory.availableBytes / live.memory.totalBytes;
    if (avail < 0.15) {
      out.push({
        level: "warn",
        title: t.memTight,
        detail: t.memTightDetail(formatMem(live.memory.availableBytes), formatPct(avail * 100)),
        part: "ram-0",
      });
    }
    if (live.memory.swapUsedBytes > 4 * 1024 ** 3) {
      out.push({
        level: "warn",
        title: t.swap,
        detail: t.swapDetail(formatMem(live.memory.swapUsedBytes)),
        part: "ram-0",
      });
    }
    const temp = live.cpu.packageTemp;
    if (temp != null && temp >= 90) {
      out.push({ level: "danger", title: t.cpuHot, detail: t.cpuHotDetail(Math.round(temp)), part: "cooling" });
    } else if (temp != null && temp >= 80) {
      out.push({ level: "info", title: t.cpuWarm, detail: t.cpuWarmDetail(Math.round(temp)), part: "cooling" });
    }
  }

  if (m.memory.channels === 2) {
    out.push({
      level: "ok",
      title: t.dual,
      detail: t.dualDetail(m.memory.modules.length, m.memory.modules[0]?.type ?? ""),
      part: "ram-0",
    });
  } else if (m.memory.channels === 1 && m.gpus.some((g) => g.integrated)) {
    out.push({ level: "warn", title: t.single, detail: t.singleDetail, part: "ram-0" });
  }

  if (m.battery?.designedCapacity) {
    const health = (m.battery.maxCapacity / m.battery.designedCapacity) * 100;
    out.push({
      level: health >= 80 ? "ok" : "warn",
      title: health >= 80 ? t.batteryOk : t.batteryWorn,
      detail: t.batteryDetail(health.toFixed(1), m.battery.cycleCount),
      part: "battery",
    });
  }

  for (const v of m.volumes) {
    const used = v.usedBytes / v.sizeBytes;
    if (used > 0.85) {
      out.push({
        level: "warn",
        title: t.diskFull(v.mounts[0]),
        detail: t.diskFullDetail(formatPct(used * 100)),
        part: "ssd-0",
      });
    }
  }

  const order: Record<InsightLevel, number> = { danger: 0, warn: 1, info: 2, ok: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
