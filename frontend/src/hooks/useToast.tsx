"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastWithCorrelation extends ToastMessage {
  correlationId: string;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => string;
  addToastWithCorrelation: (toast: Omit<ToastMessage, "id"> & { correlationId: string }) => string;
  updateToast: (correlationId: string, patch: Partial<Omit<ToastMessage, "id">>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;
const nextId = () => `toast-${++toastCounter}`;

// Module-level correlation map: correlationId -> toast entry.
// Entries are removed when the corresponding toast is dismissed/expires
// so the map does not grow unbounded.
const correlationMap = new Map<string, ToastWithCorrelation>();

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => {
        const target = prev.find((t) => t.id === id);
        if (target) {
          const entry = correlationMap.get(target.id);
          if (entry) {
            correlationMap.delete(target.id);
          }
        }
        return prev.filter((t) => t.id !== id);
      });
    },
    [clearTimer]
  );

  const scheduleExpiry = useCallback(
    (toast: ToastMessage) => {
      if (toast.duration && toast.duration > 0) {
        clearTimer(toast.id);
        const timer = setTimeout(() => removeToast(toast.id), toast.duration);
        timers.current.set(toast.id, timer);
      }
    },
    [clearTimer, removeToast]
  );

  const addToast = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = nextId();
      const entry: ToastMessage = { ...toast, id };
      setToasts((prev) => [...prev, entry]);
      scheduleExpiry(entry);
      return id;
    },
    [scheduleExpiry]
  );

  const addToastWithCorrelation = useCallback(
    (toast: Omit<ToastMessage, "id"> & { correlationId: string }) => {
      const existing = correlationMap.get(toast.correlationId);
      if (existing) {
        // Dedup: update the existing toast instead of stacking a new one.
        setToasts((prev) =>
          prev.map((t) =>
            t.id === existing.id
              ? { ...t, type: toast.type, title: toast.title, message: toast.message, duration: toast.duration }
              : t
          )
        );
        const updated: ToastWithCorrelation = {
          ...existing,
          type: toast.type,
          title: toast.title,
          message: toast.message,
          duration: toast.duration,
        };
        correlationMap.set(toast.correlationId, updated);
        scheduleExpiry(updated);
        return existing.id;
      }

      const id = nextId();
      const entry: ToastWithCorrelation = { ...toast, id };
      correlationMap.set(toast.correlationId, entry);
      setToasts((prev) => [...prev, entry]);
      scheduleExpiry(entry);
      return id;
    },
    [scheduleExpiry]
  );

  const updateToast = useCallback(
    (correlationId: string, patch: Partial<Omit<ToastMessage, "id">>) => {
      const existing = correlationMap.get(correlationId);
      if (!existing) return;

      const updated: ToastWithCorrelation = { ...existing, ...patch };
      correlationMap.set(correlationId, updated);

      setToasts((prev) =>
        prev.map((t) => (t.id === existing.id ? { ...t, ...patch } : t))
      );
      scheduleExpiry(updated);
    },
    [scheduleExpiry]
  );

  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
      currentTimers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, addToast, addToastWithCorrelation, updateToast, removeToast }),
    [toasts, addToast, addToastWithCorrelation, updateToast, removeToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export const TOAST_CONTRACT = {
  pending: (message: string, correlationId: string): Omit<ToastMessage, "id"> & { correlationId: string } => ({
    type: "info",
    title: "In progress",
    message,
    correlationId,
    duration: 0,
  }),
  success: (message: string, correlationId: string): Omit<ToastMessage, "id"> & { correlationId: string } => ({
    type: "success",
    title: "Success",
    message,
    correlationId,
  }),
  error: (message: string, correlationId: string): Omit<ToastMessage, "id"> & { correlationId: string } => ({
    type: "error",
    title: "Error",
    message,
    correlationId,
  }),
};
