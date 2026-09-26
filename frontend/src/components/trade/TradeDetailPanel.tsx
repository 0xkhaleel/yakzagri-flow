"use client";

import React from "react";
import { TradeHeader } from "./TradeHeader";
import { PartiesPanel } from "./PartiesPanel";
import { FinancialSummary } from "./FinancialSummary";
import { TradeTimeline } from "./TradeTimeline";
import { TransactionTimeline } from "./TransactionTimeline";
import { ContractInfo } from "./ContractInfo";
import { ActionBar } from "./ActionBar";
import { VaultSidebar } from "./VaultSidebar";
import type { TradeDetail } from "@/types/trade";

interface TradeDetailPanelProps {
  trade: TradeDetail;
  onConfirmDelivery?: () => void;
  onRaiseDispute?: () => void;
  onReleaseFunds?: () => void;
  actionLoading?: boolean;
  actionError?: string | null;
  actionSuccess?: string | null;
}

export function TradeDetailPanel({
  trade,
  onConfirmDelivery,
  onRaiseDispute,
  onReleaseFunds,
  actionLoading = false,
  actionError,
  actionSuccess,
}: TradeDetailPanelProps) {
  return (
    <div className="min-h-screen bg-primary pb-28">
      {/* Page grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-7xl mx-auto p-6">
        {/* ── Left column (main) ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <TradeHeader trade={trade} onConfirmDelivery={onConfirmDelivery} confirmingDelivery={actionLoading} />
          {actionError && <p role="alert" className="rounded-lg border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{actionError}</p>}
          {actionSuccess && <p role="status" className="rounded-lg border border-emerald/30 bg-emerald/10 p-3 text-sm text-emerald">{actionSuccess}</p>}
          <PartiesPanel buyer={trade.buyer} seller={trade.seller} />
          <FinancialSummary trade={trade} />
          <TradeTimeline events={trade.timeline} />
        </div>

        {/* ── Right column (sidebar) ── */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <VaultSidebar trade={trade} />
          {trade.transactionTimeline && (
            <TransactionTimeline
              events={trade.transactionTimeline}
              currentEventIndex={trade.currentTransactionIndex ?? 0}
            />
          )}
          <ContractInfo trade={trade} />
        </div>
      </div>

      {/* ── Fixed bottom Action Bar ── */}
      <ActionBar
        trade={trade}
        onConfirmDelivery={onConfirmDelivery}
        onRaiseDispute={onRaiseDispute}
        onReleaseFunds={onReleaseFunds}
        confirmingDelivery={actionLoading}
      />
    </div>
  );
}
