"use client";
import { t as translateCopy } from "@/lib/i18n";


import React from "react";
import type { TimelineEvent } from "@/types/trade";

interface TradeTimelineProps {
  events: TimelineEvent[];
}

/**
 * On-chain event types emitted by the amana_escrow contract
 * (see schemas/events/amana_escrow.events.json).
 */
type OnChainEventType =
  | "escrow_initialized"
  | "escrow_funded"
  | "inspection_passed"
  | "inspection_failed"
  | "dispatched"
  | "delivered"
  | "settlement"
  | "refunded"
  | "disputed";

/**
 * Off-chain actions recorded by the platform (not emitted on-chain).
 */
type OffChainActionType =
  | "inspection_scheduled"
  | "inspection_completed"
  | "shipment_created"
  | "document_uploaded"
  | "message_sent";

type TradeEventType = OnChainEventType | OffChainActionType;

interface TradeEventMeta {
  title: string;
  description: string;
  source: "on-chain" | "off-chain";
}

/**
 * Human-readable metadata for every on-chain event and off-chain action.
 * Keeps statuses and descriptions consistent across the merged timeline.
 */
const EVENT_META: Record<TradeEventType, TradeEventMeta> = {
  escrow_initialized: {
    title: "Escrow Initialized",
    description: "Escrow account created for this trade.",
    source: "on-chain",
  },
  escrow_funded: {
    title: "Escrow Funded",
    description: "Buyer deposited funds into the escrow contract.",
    source: "on-chain",
  },
  inspection_passed: {
    title: "Inspection Passed",
    description: "Inspection completed and the goods passed verification.",
    source: "on-chain",
  },
  inspection_failed: {
    title: "Inspection Failed",
    description: "Inspection completed but the goods did not pass verification.",
    source: "on-chain",
  },
  dispatched: {
    title: "Dispatched",
    description: "Seller dispatched the shipment to the buyer.",
    source: "on-chain",
  },
  delivered: {
    title: "Delivered",
    description: "Shipment was delivered and confirmed by the buyer.",
    source: "on-chain",
  },
  settlement: {
    title: "Settlement",
    description: "Escrowed funds released to the seller.",
    source: "on-chain",
  },
  refunded: {
    title: "Refunded",
    description: "Escrowed funds returned to the buyer.",
    source: "on-chain",
  },
  disputed: {
    title: "Disputed",
    description: "A dispute was raised and the trade is under review.",
    source: "on-chain",
  },
  inspection_scheduled: {
    title: "Inspection Scheduled",
    description: "An inspection was scheduled for this trade.",
    source: "off-chain",
  },
  inspection_completed: {
    title: "Inspection Completed",
    description: "The inspector submitted their findings.",
    source: "off-chain",
  },
  shipment_created: {
    title: "Shipment Created",
    description: "A shipment record was created for tracking.",
    source: "off-chain",
  },
  document_uploaded: {
    title: "Document Uploaded",
    description: "A supporting document was attached to the trade.",
    source: "off-chain",
  },
  message_sent: {
    title: "Message Sent",
    description: "A message was exchanged between the parties.",
    source: "off-chain",
  },
};

const EVENT_ICONS: Record<TimelineEvent["type"], React.ReactNode> = {
  escrow_funded: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 8l2.5 2.5L11 5.5" />
      <circle cx="8" cy="8" r="7" />
    </svg>
  ),
  inspection_passed: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V9" />
      <path d="M9 1l4 4-6 6H3v-4l6-6z" />
    </svg>
  ),
  dispatched: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="1" y="5" width="10" height="8" rx="1" />
      <path d="M11 7h2l2 3v3h-4V7z" />
      <circle cx="4" cy="13" r="1.5" />
      <circle cx="12" cy="13" r="1.5" />
    </svg>
  ),
  settlement: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="7" />
      <path d="M8 5v3l2 2" />
    </svg>
  ),
};

const EVENT_STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald text-text-inverse",
  current: "bg-status-warning text-text-inverse ring-4 ring-status-warning/20",
  pending: "bg-elevated text-text-muted border border-border-default",
};

/**
 * Resolve the human-readable title/description for an event, falling back to
 * the values already present on the event when the type is unknown.
 */
function resolveEventMeta(event: TimelineEvent): TradeEventMeta {
  const meta = EVENT_META[event.type as TradeEventType];
  return {
    title: meta?.title ?? event.title,
    description: meta?.description ?? event.description ?? "",
    source: meta?.source ?? "on-chain",
  };
}

/**
 * Merge on-chain events and off-chain actions into a single, chronologically
 * ordered timeline so trade progress is reflected in one place.
 */
function mergeEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : NaN;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : NaN;
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return aTime - bTime;
  });
}

export function TradeTimeline({ events }: TradeTimelineProps) {
  const mergedEvents = mergeEvents(events);

  return (
    <div className="bg-card rounded-xl border border-border-default p-6 shadow-card">
      <div className="flex items-center gap-2 mb-5">
        <svg className="w-4 h-4 text-gold" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2 4l6-2 6 2v7l-6 2-6-2V4z" />
          <path d="M8 2v12M2 4l6 2 6-2" />
        </svg>
        <h2 className="text-sm font-semibold text-text-secondary tracking-wide uppercase">
          {translateCopy("ui.trade_lifecycle_43c99d5")}
        </h2>
      </div>

      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-5 bottom-5 w-px bg-border-default" />

        <div className="flex flex-col gap-0">
          {mergedEvents.map((event, index) => (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon node */}
              <div
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  EVENT_STATUS_STYLES[event.status]
                }`}
              >
                {EVENT_ICONS[event.type]}
              </div>

              {/* Content */}
              <div
                className={`flex-1 pb-6 ${
                  index === events.length - 1 ? "pb-0" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p
                    className={`text-sm font-semibold ${
                      event.status === "pending"
                        ? "text-text-muted"
                        : "text-text-primary"
                    }`}
                  >
                    {event.title}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.status === "current" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-status-warning/10 text-status-warning border border-status-warning/20 font-medium">
                        {translateCopy("ui.current_state_ab46d02")}
                      </span>
                    )}
                    {event.timestamp && (
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {event.timestamp}
                      </span>
                    )}
                  </div>
                </div>

                {event.description && (
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {event.description}
                  </p>
                )}

                {/* Live tracking card */}
                {event.tracking && (
                  <div className="mt-3 flex items-center gap-3 bg-elevated rounded-lg p-3 border border-border-default">
                    <div className="w-12 h-12 rounded-md bg-teal/10 border border-teal/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {event.tracking.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={event.tracking.imageUrl}
                          alt={translateCopy("ui.vessel_9037007")}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <svg className="w-6 h-6 text-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 20h20M4 20V10l8-7 8 7v10" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-0.5">
                        {translateCopy("ui.live_tracking_ced273c")}
                      </p>
                      <p className="text-sm font-semibold text-text-primary">
                        {translateCopy("ui.tracking_ef32e08")}{" "}{event.tracking.trackingNumber}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
