"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { signTransaction } from "@stellar/freighter-api";
import { useAuth } from "@/hooks/useAuth";
import { useTradeDetail } from "@/hooks/useTradeDetail";
import { useWallet } from "@/hooks/useWallet";
import { api, ApiError } from "@/lib/api";
import { apiConfig } from "@/lib/api";
import { withIdempotency } from "@/lib/api/client";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddress(address: string) {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function InfoCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{title}</p>
      <p className="mt-3 text-lg font-semibold text-text-primary font-mono">{value}</p>
      <p className="mt-2 text-xs text-text-secondary">{helper}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    FUNDED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    SETTLED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    DISPUTED: "bg-red-500/15 text-red-400 border-red-500/30",
    CANCELLED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  const cls = colors[status.toUpperCase()] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

type UserRole = "buyer" | "seller" | "mediator" | "observer";

function deriveRole(
  walletAddress: string | null,
  buyerAddress: string,
  sellerAddress: string,
): UserRole {
  if (!walletAddress) return "observer";
  const addr = walletAddress.toLowerCase();
  if (addr === buyerAddress.toLowerCase()) return "buyer";
  if (addr === sellerAddress.toLowerCase()) return "seller";
  return "observer";
}

export default function TradeDetailPage() {
  const params = useParams<{ id: string }>();
  const tradeId = params?.id ?? "UNKNOWN";

  const { token, address, isAuthenticated } = useAuth();
  const { trade, loading, error, refetch } = useTradeDetail(tradeId);
  const { balance, asset } = useWallet();

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const role: UserRole = trade
    ? deriveRole(address, trade.buyerAddress, trade.sellerAddress)
    : "observer";

  const status = (trade?.status ?? "").toUpperCase();

  async function runAction(
    label: string,
    action: string,
    apiCall: () => Promise<{ unsignedXdr: string }>,
  ) {
    if (!token) return;

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const { unsignedXdr } = await withIdempotency(
        () => apiCall(),
        { key: `${action}:${tradeId}` },
      );
      const networkPassphrase = apiConfig.getStellarNetworkPassphrase();

      const result = await signTransaction(unsignedXdr, {
        networkPassphrase,
        address: address ?? undefined,
      });

      if ("error" in result && result.error) {
        throw new Error((result.error as { message?: string }).message ?? "Signing failed");
      }

      setActionSuccess(`${label} signed successfully. Submit the transaction to Stellar to finalize.`);
      void refetch();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : `${label} failed`;
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }

  function handleDeposit() {
    void runAction("Deposit", "deposit", () => api.trades.deposit(token!, tradeId));
  }

  function handleConfirmDelivery() {
    void runAction("Confirm Delivery", "confirm-delivery", () =>
      api.trades.confirmDelivery(token!, tradeId),
    );
  }

  function handleReleaseFunds() {
    void runAction("Release Funds", "release-funds", () => api.trades.releaseFunds(token!, tradeId));
  }

  function handleInitiateDispute() {
    const reason = window.prompt("Enter dispute reason (min 10 characters):");
    if (!reason || reason.length < 10) {
      setActionError("Dispute reason must be at least 10 characters.");
      return;
    }
    void runAction("Initiate Dispute", "initiate-dispute", () =>
      api.trades.initiateDispute(token!, tradeId, reason, "other"),
    );
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Trade Details</h1>
        <Link
          href="/trades"
          className="px-3 py-1.5 rounded-md border border-border-default hover:border-border-hover text-text-secondary hover:text-text-primary transition-colors"
        >
          Back to Trades
        </Link>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin w-8 h-8 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-status-danger/20 bg-red-500/10 px-4 py-3 text-center">
          <p className="text-status-danger text-sm">{error}</p>
          <button
            onClick={() => void refetch()}
            className="mt-2 text-xs underline text-text-secondary hover:text-text-primary"
          >
            Retry
          </button>
        </div>
      )}

      {/* Trade data */}
      {!loading && !error && trade && (
        <div className="space-y-6">
          {/* Identity row */}
          <div className="rounded-lg border border-border-default bg-bg-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Trade ID</p>
                <p className="mt-2 text-xl font-semibold text-text-primary font-mono">{trade.tradeId}</p>
                <p className="mt-2 text-xs text-text-muted">Created: {formatDate(trade.createdAt)}</p>
                <p className="mt-1 text-xs text-text-muted">Updated: {formatDate(trade.updatedAt)}</p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <StatusBadge status={trade.status} />
                {role !== "observer" && (
                  <span className="text-xs text-text-muted capitalize">Your role: {role}</span>
                )}
              </div>
            </div>
          </div>

          {/* Wallet balance */}
          {isAuthenticated && balance !== null && (
            <div className="rounded-lg border border-border-default bg-bg-card p-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-text-muted">Wallet Balance</p>
              <p className="text-sm font-semibold text-text-primary">
                {balance} {asset}
              </p>
            </div>
          )}

          {/* On-chain + off-chain status panel */}
          <div className="rounded-lg border border-border-default bg-bg-card p-5 space-y-3">
            <p className="text-xs uppercase tracking-wide text-text-muted mb-3">Contract State</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-tex

/* … truncated 5591 chars — edit only what you need near the top … */
