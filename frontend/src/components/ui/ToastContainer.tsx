"use client";

import React from "react";
import { useToast } from "@/hooks/useToast";
import { Toast } from "./Toast";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-md pointer-events-none sm:top-6 sm:right-6">
      <div role="status" aria-live="polite" aria-atomic="false" className="flex flex-col gap-2">
        {toasts.filter((toast) => toast.type !== "error").map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="false" className="flex flex-col gap-2">
        {toasts.filter((toast) => toast.type === "error").map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
}
