"use client";
import { t as translateCopy } from "@/lib/i18n";


import React from "react";
import type { TradeDetail } from "@/types/trade";

interface VaultSidebarProps {
  trade: TradeDetail;
}

export function VaultSidebar({ trade }: VaultSidebarProps) {
  return (
    <div className="bg-card rounded-xl border border-border-default p-6 shadow-card">
      <p className="text-xs font-semibold tracking-widest text-text-muted mb-1 uppercase">
        {translateCopy("ui.vault_amount_locked_39aaa41")}
      </p>
      <p className="text-4xl font-bold text-gold mb-4">
        {trade.vaultAmountLocked.toLocaleString()}{" "}
        <span className="text-xl font-semibold text-text-secondary">cNGN</span>
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">{translateCopy("ui.asset_value_1ee2852")}</span>
          <span className="text-text-primary font-medium">
            {trade.assetValue.toLocaleString()} cNGN
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">
            {translateCopy("ui.platform_fee_427cfef")}{trade.platformFeePercent}%)
          </span>
          <span className="text-status-danger font-medium">
            {trade.platformFee.toLocaleString()} cNGN
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">{translateCopy("ui.network_gas_est_64e9bb5")}</span>
          <span className="text-text-muted font-medium">
            {trade.networkGasEst} {translateCopy("ui.eth_edf3432")}
          </span>
        </div>
      </div>

      {/* Smart contract badge */}
      <div className="flex items-start gap-3 bg-emerald-muted rounded-lg p-3 border border-emerald/20">
        <div className="w-7 h-7 rounded-md bg-emerald/10 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-3.5 h-3.5 text-emerald"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M8 1L2 4v4c0 3.3 2.5 6.4 6 7 3.5-.6 6-3.7 6-7V4L8 1z" />
            <path d="M5.5 8l2 2L11 5.5" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-emerald mb-0.5 tracking-wide">
            {translateCopy("ui.smart_contract_secured_e779579")}
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {translateCopy("ui.funds_are_programmatically_locke_01d3ceb")}
          </p>
        </div>
      </div>

      {/* Dispute help */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-default">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-elevated border border-border-default flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-text-secondary"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="8" cy="8" r="7" />
              <path d="M8 7v1M8 11v.5" strokeLinecap="round" />
              <path d="M6.5 5.5C6.5 4.7 7.2 4 8 4s1.5.7 1.5 1.5c0 1-1.5 2-1.5 2" />
            </svg>
          </div>
          <span className="text-xs text-text-secondary">{translateCopy("ui.need_help_8a38384")}</span>
          <span className="text-xs text-text-muted">{translateCopy("ui.dispute_resolution_417b353")}</span>
        </div>
        <button className="text-xs font-semibold text-gold hover:text-gold-hover transition-colors">
          {translateCopy("ui.open_ticket_399bfe4")}
        </button>
      </div>
    </div>
  );
}
