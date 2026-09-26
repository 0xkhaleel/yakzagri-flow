"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api/env";

export interface UseOfflineReturn {
  isOffline: boolean;
  wasOffline: boolean;
  isOnline: boolean;
  retryOnline: () => Promise<void>;
}

// Use same-origin /api health probe instead of google (CSP connect-src blocks external)
// Falls back to navigator.onLine if fetch probe fails due to CORS
const ONLINE_CHECK_INTERVAL_MS = 5000;

function getProbeUrl(): string {
  try {
    const base = getApiBaseUrl();
    // Use /health or /trades as lightweight probe; health is cheapest
    return `${base}/health`;
  } catch {
    return "/api/health";
  }
}

export function useOffline(): UseOfflineReturn {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  const checkOnlineStatus = useCallback(async () => {
    // Fast path: navigator.onLine false => offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setWasOffline(true);
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const probeUrl = getProbeUrl();
      const response = await fetch(probeUrl, {
        method: "GET",
        cache: "no-cache",
        signal: controller.signal,
        // Don't send custom headers that trigger CORS preflight on same-origin requests
      });

      clearTimeout(timeoutId);

      const online = response.ok || (response.status >= 200 && response.status < 500);
      // 5xx still means network is up (server reachable)
      const isActuallyOnline = online || response.status === 0;
      setIsOffline(!isActuallyOnline);
      if (!isActuallyOnline) {
        setWasOffline(true);
      }
      // If online, keep wasOffline flag until caller clears it via retryOnline
      return isActuallyOnline;
    } catch {
      // If fetch fails, treat as offline for safety
      const offline = typeof navigator !== "undefined" ? !navigator.onLine : true;
      if (offline) {
        // Probe failure => consider offline (conservative)
        setIsOffline(true);
        setWasOffline(true);
        return false;
      }
      // Navigator says online but fetch failed; keep current state and return false
      setIsOffline(true);
      setWasOffline(true);
      return false;
    }
  }, []);

  const retryOnline = useCallback(async () => {
    const online = await checkOnlineStatus();
    if (online) {
      setWasOffline(false);
    }
  }, [checkOnlineStatus]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // keep wasOffline true until consumer handles replay, then they call retryOnline to clear
    };
    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(checkOnlineStatus, ONLINE_CHECK_INTERVAL_MS);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkOnlineStatus();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkOnlineStatus]);

  return {
    isOffline,
    wasOffline,
    isOnline: !isOffline,
    retryOnline,
  };
}