import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CoreKind, MemoryModule, PhysicalCore } from "@/types/hardware";
import type { HwmonDevice } from "./collector";

const execFileP = promisify(execFile);

/**
 * Windows exposes P/E-core classification only through the Win32 API
 * `GetLogicalProcessorInformationEx` (WMI does not carry EfficiencyClass).
 * We call it via a short-lived PowerShell + C# P/Invoke shim and read the raw
 * SYSTEM_LOGICAL_PROCESSOR_INFORMATION_EX buffer.
 *
 * Everything here degrades honestly: any failure returns [] so machine.ts /
 * live.ts fall back to systeminformation instead of guessing.
 */
const CSHARP = `
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class Topo {
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool GetLogicalProcessorInformationEx(int RelationshipType, IntPtr Buffer, ref uint ReturnedLength);

  public static string Get() {
    char q = '"';
    uint len = 0;
    // RelationProcessorCore = 0. First call returns the required buffer size.
    GetLogicalProcessorInformationEx(0, IntPtr.Zero, ref len);
    if (len == 0) return "[]";
    IntPtr buf = Marshal.AllocHGlobal((int)len);
    try {
      if (!GetLogicalProcessorInformationEx(0, buf, ref len)) return "[]";
      int gaSize = IntPtr.Size == 8 ? 16 : 12; // GROUP_AFFINITY size (x64 vs x86)
      StringBuilder sb = new StringBuilder();
      sb.Append("[");
      long baseAddr = buf.ToInt64();
      long offset = 0;
      bool first = true;
      while (offset < (long)len) {
        IntPtr rec = new IntPtr(baseAddr + offset);
        int relationship = Marshal.ReadInt32(rec, 0);
        int size = Marshal.ReadInt32(rec, 4);
        if (size <= 0) break;
        if (relationship == 0) {
          byte flags = Marshal.ReadByte(rec, 8);      // PROCESSOR_RELATIONSHIP.Flags
          byte eff = Marshal.ReadByte(rec, 9);        // EfficiencyClass
          short groupCount = Marshal.ReadInt16(rec, 30);
          List<int> cpus = new List<int>();
          for (int g = 0; g < groupCount; g++) {
            int gaOff = 32 + g * gaSize;              // GroupMask[g]
            long mask = IntPtr.Size == 8
              ? Marshal.ReadInt64(rec, gaOff)
              : (long)(uint)Marshal.ReadInt32(rec, gaOff);
            short group = Marshal.ReadInt16(rec, gaOff + IntPtr.Size);
            for (int bit = 0; bit < 64; bit++) {
              if (((mask >> bit) & 1L) != 0L) cpus.Add(group * 64 + bit);
            }
          }
          if (!first) sb.Append(",");
          first = false;
          sb.Append("{" + q + "eff" + q + ":" + eff + "," + q + "smt" + q + ":" + ((flags & 1) != 0 ? "true" : "false") + "," + q + "cpus" + q + ":[");
          for (int i = 0; i < cpus.Count; i++) { if (i > 0) sb.Append(","); sb.Append(cpus[i]); }
          sb.Append("]}");
        }
        offset += size;
      }
      sb.Append("]");
      return sb.ToString();
    } finally {
      Marshal.FreeHGlobal(buf);
    }
  }
}
`;

const TOPO_SCRIPT = `$ErrorActionPreference = 'Stop'
$src = @"
${CSHARP}
"@
Add-Type -TypeDefinition $src -Language CSharp | Out-Null
[Console]::Out.Write([Topo]::Get())`;

interface RawCore {
  eff: number;
  smt: boolean;
  cpus: number[];
}

async function runPowerShell(script: string): Promise<string> {
  // -EncodedCommand takes base64 of the UTF-16LE script, sidestepping all shell quoting.
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const { stdout } = await execFileP(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
    { windowsHide: true, maxBuffer: 4 * 1024 * 1024, timeout: 15_000 },
  );
  return stdout;
}

export async function readCpuTopology(): Promise<PhysicalCore[]> {
  try {
    const raw = JSON.parse(await runPowerShell(TOPO_SCRIPT)) as RawCore[];
    if (!Array.isArray(raw) || raw.length === 0) return [];

    // EfficiencyClass is relative: higher value = higher performance.
    // 3 distinct classes → P / E / LP-E; 2 → P / E; 1 → all P.
    const classes = [...new Set(raw.map((r) => r.eff))].sort((a, b) => b - a);
    const kindFor = (eff: number): CoreKind => {
      if (classes.length >= 3) {
        if (eff === classes[0]) return "P";
        return eff === classes[classes.length - 1] ? "LPE" : "E";
      }
      if (classes.length === 2) return eff === classes[0] ? "P" : "E";
      return "P";
    };

    const order: Record<CoreKind, number> = { P: 0, E: 1, LPE: 2 };
    return raw
      .map(
        (r, i): PhysicalCore => ({
          kind: kindFor(r.eff),
          coreId: i,
          maxMHz: 0, // per-core max frequency is not exposed; machine.ts backfills P cores.
          cpus: [...r.cpus].sort((a, b) => a - b),
        }),
      )
      .sort((a, b) => order[a.kind] - order[b.kind] || a.coreId - b.coreId);
  } catch {
    return [];
  }
}

/** SPD EEPROM is not user-readable on Windows; fall back to systeminformation. */
export async function readMemoryModules(): Promise<MemoryModule[]> {
  return [];
}

/** No hwmon on Windows. Sensors would require a kernel driver + admin. */
export async function readHwmon(): Promise<HwmonDevice[]> {
  return [];
}

export async function readModuleTemps(): Promise<number[]> {
  return [];
}
