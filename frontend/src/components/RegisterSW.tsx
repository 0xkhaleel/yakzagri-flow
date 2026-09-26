"use client";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/register-sw";

export default function RegisterSW() {
  useEffect(() => {
    registerServiceWorker().catch((err) => {
      // Registration failures must not break the app shell; log for diagnostics.
      console.error("[RegisterSW] service worker registration failed", err);
    });
  }, []);
  return null;
}
