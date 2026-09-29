"use client";

import { useEffect, useState } from "react";
import type { LiveStats } from "@/types/hardware";

export type LiveStatus = "connecting" | "live" | "error" | "off";

const INTERVAL_MS = 2000;
const HISTORY = 60;

export function useLiveStats(enabled: boolean) {
  const [live, setLive] = useState<LiveStats | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [status, setStatus] = useState<Exclude<LiveStatus, "off">>("connecting");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as LiveStats;
        if (cancelled) return;
        setLive(data);
        setHistory((h) => [...h.slice(-(HISTORY - 1)), data.cpu.load]);
        setStatus("live");
      } catch {
        if (!cancelled) setStatus("error");
      }
      if (!cancelled) timer = setTimeout(tick, INTERVAL_MS);
    };
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled]);

  return {
    live: enabled ? live : null,
    history: enabled ? history : [],
    status: (enabled ? status : "off") as LiveStatus,
  };
}
