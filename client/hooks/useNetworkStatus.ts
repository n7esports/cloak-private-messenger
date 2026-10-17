"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type NetworkStatus = "checking" | "online" | "offline";

const HEALTH_CHECK_INTERVAL_MS = 15_000;
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>("checking");
  const checkingRef = useRef(false);

  const checkHealth = useCallback(async (signal?: AbortSignal) => {
    if (checkingRef.current || signal?.aborted) return;
    checkingRef.current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      HEALTH_CHECK_TIMEOUT_MS,
    );
    const abortCheck = () => controller.abort();
    signal?.addEventListener("abort", abortCheck, { once: true });

    try {
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      setStatus(response.ok ? "online" : "offline");
    } catch {
      if (!signal?.aborted) setStatus("offline");
    } finally {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", abortCheck);
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const ping = () => void checkHealth(controller.signal);
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") ping();
    };

    ping();
    const interval = window.setInterval(ping, HEALTH_CHECK_INTERVAL_MS);
    window.addEventListener("online", ping);
    window.addEventListener("offline", ping);
    document.addEventListener("visibilitychange", checkWhenVisible);

    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("online", ping);
      window.removeEventListener("offline", ping);
      document.removeEventListener("visibilitychange", checkWhenVisible);
    };
  }, [checkHealth]);

  return status;
}
