import type { LiveStats, MachineInfo } from "@/lib/types";
import type { PartId } from "@/lib/parts";
import { formatMem, formatPct } from "@/lib/format";

export type InsightLevel = "ok" | "info" | "warn" | "danger";

export interface Insight {
  level: InsightLevel;
  title: string;
  detail: string;
  part?: PartId;
}

export function getInsights(m: MachineInfo, live: LiveStats | null): Insight[] {
  const out: Insight[] = [];

  if (live) {
    const avail = live.memory.availableBytes / live.memory.totalBytes;
    if (avail < 0.15) {
      out.push({
        level: "warn",
        title: "内存紧张",
        detail: `只剩 ${formatMem(live.memory.availableBytes)}（${formatPct(avail * 100)}）可用。多开浏览器标签页、IDE 或开发服务器时容易变卡。`,
        part: "ram-0",
      });
    }
    if (live.memory.swapUsedBytes > 4 * 1024 ** 3) {
      out.push({
        level: "warn",
        title: "大量使用交换空间",
        detail: `已有 ${formatMem(live.memory.swapUsedBytes)} 数据被挤到交换空间。交换空间比内存慢得多，这通常说明物理内存不够用。`,
        part: "ram-0",
      });
    }
    const t = live.cpu.packageTemp;
    if (t != null && t >= 90) {
      out.push({ level: "danger", title: "CPU 过热", detail: `封装温度 ${Math.round(t)}°C，可能触发降频。检查出风口是否被挡住。`, part: "cooling" });
    } else if (t != null && t >= 80) {
      out.push({ level: "info", title: "CPU 温度偏高", detail: `封装温度 ${Math.round(t)}°C，还在安全范围内，但说明负载不低。`, part: "cooling" });
    }
  }

  if (m.memory.channels === 2) {
    out.push({
      level: "ok",
      title: "双通道内存",
      detail: `${m.memory.modules.length} 条 ${m.memory.modules[0]?.type ?? ""} 组成双通道，内存带宽翻倍，对核显性能尤其重要。`,
      part: "ram-0",
    });
  } else if (m.memory.channels === 1 && m.gpus.some((g) => g.integrated)) {
    out.push({
      level: "warn",
      title: "单通道内存",
      detail: "只有一条内存，核显性能会明显受限。加一条同规格内存组成双通道，游戏帧数能提升不少。",
      part: "ram-0",
    });
  }

  if (m.battery?.designedCapacity) {
    const health = (m.battery.maxCapacity / m.battery.designedCapacity) * 100;
    out.push({
      level: health >= 80 ? "ok" : "warn",
      title: health >= 80 ? "电池健康" : "电池老化",
      detail: `健康度 ${health.toFixed(1)}%，循环 ${m.battery.cycleCount} 次。`,
      part: "battery",
    });
  }

  for (const v of m.volumes) {
    const used = v.usedBytes / v.sizeBytes;
    if (used > 0.85) {
      out.push({
        level: "warn",
        title: `${v.mounts[0]} 空间不足`,
        detail: `已用 ${formatPct(used * 100)}。固态硬盘太满会变慢。`,
        part: "ssd-0",
      });
    }
  }

  const order: Record<InsightLevel, number> = { danger: 0, warn: 1, info: 2, ok: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
