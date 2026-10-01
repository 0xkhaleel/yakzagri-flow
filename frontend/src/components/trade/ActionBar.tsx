"use client";
import { t as translateCopy } from "@/lib/i18n";


import React from "react";
import type { TradeDetail } from "@/types/trade";

interface ActionBarProps {
  trade: TradeDetail;
  onConfirmDelivery?: () => void;
  onRaiseDispute?: () => void;
  onReleaseFunds?: () => void;
  confirmingDelivery: boolean;
}

export function ActionBar({
  trade,
  onConfirmDelivery,
  onRaiseDispute,
  onReleaseFunds,
  confirmingDelivery,
}: ActionBarProps) {
  const showPoDVerification = trade.status === "IN TRANSIT";
  const showRaiseDispute =
    trade.status === "IN TRANSIT" || trade.status === "PENDING";
  const showReleaseFunds = trade.status === "IN TRANSIT";

  return (
    <div className="fixed bottom-0 left-0 w-full bg-card/90 backdrop-blur-md border-t border-border-default p-4 flex justify-end gap-4 z-50">
      {showRaiseDispute && (
        <button
          onClick={onRaiseDispute}
          disabled={!onRaiseDispute}
          title={!onRaiseDispute ? "Disputes can only be raised by an authenticated trade party." : undefined}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-status-danger/40 text-status-danger text-sm font-semibold hover:bg-status-danger/10 transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M8 2v6M8 11v1" strokeLinecap="round" />
            <path d="M2 14L8 2l6 12H2z" />
          </svg>
          {translateCopy("ui.raise_dispute_448d5e7")}
        </button>
      )}

      {showPoDVerification && (
        <button
          disabled
          title={translateCopy("ui.proof_of_delivery_unavailable")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border-default text-text-secondary text-sm font-semibold opacity-50 cursor-not-allowed"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
            <path d="M5 8l2.5 2.5L11 5.5" />
          </svg>
          {translateCopy("ui.pod_verification_aac5dd6")}
        </button>
      )}

      {showPoDVerification && (
        <button
          onClick={onConfirmDelivery}
          disabled={!onConfirmDelivery || confirmingDelivery}
          title={!onConfirmDelivery ? "Only the authenticated buyer can confirm delivery for this trade." : undefined}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-gold-cta text-text-inverse text-sm font-bold hover:shadow-glow-gold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {confirmingDelivery ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M8 2a6 6 0 016 6" />
              </svg>
              {translateCopy("ui.confirming_0c2708b")}
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="8" cy="8" r="7" />
                <path d="M5 8l2.5 2.5L11 5.5" />
              </svg>
              {translateCopy("ui.confirm_delivery_e6dee98")}
            </>
          )}
        </button>
      )}

      {showReleaseFunds && (
        <button
          onClick={onReleaseFunds}
          disabled={!onReleaseFunds}
          title={!onReleaseFunds ? "Only the authenticated seller can release funds for this trade." : undefined}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald text-text-inverse text-sm font-bold hover:shadow-glow-emerald transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 1v8M5 6l3 3 3-3" />
            <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" />
          </svg>
          {translateCopy("ui.release_funds_2f565c4")}
        </button>
      )}
    </div>
  );
}
