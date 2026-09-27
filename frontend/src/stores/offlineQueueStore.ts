"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getOrCreateIdempotencyKey, clearIdempotencyKey } from "@/lib/idempotency";
import { generateCorrelationId } from "@/lib/correlationId";
import { ApiError } from "@/lib/api";

export type QueuedActionType = "create-trade" | "deposit" | "release" | "dispute" | "manifest";

export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  endpoint: string;
  method: string;
  body?: unknown;
  idempotencyKey: string;
  correlationId: string;
  createdAt: string;
  attempts: number;
}

interface OfflineQueueState {
  queue: QueuedAction[];
  isOnline: boolean;
  enqueue: (action: Omit<QueuedAction, "id" | "createdAt" | "attempts" | "idempotencyKey" | "correlationId"> & Partial<Pick<QueuedAction, "idempotencyKey" | "correlationId">>) => QueuedAction;
  dequeue: (id: string) => void;
  clear: () => void;
  setOnline: (online: boolean) => void;
  replay: (executor: (action: QueuedAction) => Promise<void>) => Promise<{ succeeded: string[]; failed: string[] }>;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isOnline: true,

      enqueue: (action) => {
        const idempotencyKey =
          action.idempotencyKey ??
          getOrCreateIdempotencyKey(`queue:${action.type}:${action.endpoint}`);
        const correlationId = action.correlationId ?? generateCorrelationId();
        const entry: QueuedAction = {
          ...action,
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
          attempts: 0,
          idempotencyKey,
          correlationId,
        };
        set((s) => ({ queue: [...s.queue, entry] }));
        return entry;
      },

      dequeue: (id) => set((s) => ({ queue: s.queue.filter((a) => a.id !== id) })),

      clear: () => set({ queue: [] }),

      setOnline: (online) => set({ isOnline: online }),

      replay: async (executor) => {
        const { queue } = get();
        const succeeded: string[] = [];
        const failed: string[] = [];
        for (const action of [...queue]) {
          try {
            // Increment attempts
            set((s) => ({ queue: s.queue.map((a) => (a.id === action.id ? { ...a, attempts: a.attempts + 1 } : a)) }));
            await executor({ ...action, attempts: action.attempts + 1 });
            set((s) => ({ queue: s.queue.filter((a) => a.id !== action.id) }));
            succeeded.push(action.id);
            clearIdempotencyKey(`queue:${action.type}:${action.endpoint}`);
          } catch (err: unknown) {
            const isConflict =
              (err instanceof ApiError && err.status === 409) ||
              (typeof err === "object" && err !== null && ("status" in err && (err as { status: unknown }).status === 409)) ||
              (typeof err === "object" && err !== null && ("statusCode" in err && (err as { statusCode: unknown }).statusCode === 409)) ||
              (err instanceof Error && /409|conflict|already[- ]processed/i.test(err.message));

            if (isConflict) {
              // 409 indicates the action was already processed on the server with this idempotency key.
              // Resolve the queue entry instead of replaying forever (acceptance criteria).
              set((s) => ({ queue: s.queue.filter((a) => a.id !== action.id) }));
              succeeded.push(action.id);
              clearIdempotencyKey(`queue:${action.type}:${action.endpoint}`);
            } else {
              failed.push(action.id);
            }
          }
        }
        return { succeeded, failed };
      },
    }),
    {
      name: "amana-offline-queue",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ queue: state.queue }),
    },
  ),
);
