const GIB = 1024 ** 3;

/** Memory sizes: binary units, shown as "GB" the way OSes and vendors label RAM. */
export function formatMem(bytes: number, digits = 1): string {
  const gib = bytes / GIB;
  return `${gib >= 10 ? gib.toFixed(0) : gib.toFixed(digits)} GB`;
}

/** Storage sizes: decimal units, matching how drives are sold. */
export function formatDisk(bytes: number): string {
  const tb = bytes / 1e12;
  if (tb >= 1) return `${tb.toFixed(tb >= 10 ? 0 : 2)} TB`;
  return `${(bytes / 1e9).toFixed(0)} GB`;
}

export function formatCache(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes % (1024 * 1024) ? 1 : 0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function formatPct(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function formatTemp(c: number | null | undefined): string {
  return c == null ? "—" : `${Math.round(c)}°C`;
}

export function formatGHz(mhz: number): string {
  return `${(mhz / 1000).toFixed(1)} GHz`;
}
