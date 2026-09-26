"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { api, ApiError, type AdminStreamSummary } from "@/lib/api";
import { Breadcrumb } from "@/components/ui";

export default function StreamsPage() {
  const { token, isAuthenticated, isWalletConnected, isLoading: authLoading, connectWallet, authenticate } = useAuth();
  const { canAccessAdmin } = useAdmin();
  const [streams, setStreams] = useState<AdminStreamSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = useCallback(async () => {
    if (!token || !canAccessAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.adminStreams.list(token, { page, limit: 20 });
      setStreams(response.items);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load streams. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, canAccessAdmin, page]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && canAccessAdmin) void fetchStreams();
    else setLoading(false);
  }, [authLoading, isAuthenticated, canAccessAdmin, fetchStreams]);

  const breadcrumbItems = [
    { label: "Home", path: "/" },
    { label: "Streams" },
  ];

  return (
    <section className="min-h-full bg-bg-primary px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {authLoading || loading ? (
          <div className="rounded-lg border border-border-default bg-card px-5 py-10 text-center text-sm text-text-secondary" aria-live="polite">
            Loading streams...
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-lg border border-border-default bg-card px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-text-primary">Connect to view streams</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
              Sign in with your Freighter wallet to access stream records.
            </p>
            <button
              onClick={() => (isWalletConnected ? authenticate() : connectWallet())}
              className="mt-5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-text-inverse hover:bg-gold-hover"
            >
              {isWalletConnected ? "Sign In" : "Connect Freighter"}
            </button>
          </div>
        ) : !canAccessAdmin ? (
          <div className="rounded-lg border border-border-default bg-card px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-text-primary">Stream list unavailable</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-text-secondary">
              The available stream listing is restricted to administrators. You can still open a stream directly when you have its ID.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-5 py-6 text-center">
            <p className="text-sm text-status-danger">{error}</p>
            <button onClick={() => void fetchStreams()} className="mt-4 rounded-md border border-border-default px-4 py-2 text-sm text-text-primary">
              Try again
            </button>
          </div>
        ) : streams.length === 0 ? (
          <div className="rounded-lg border border-border-default bg-card px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-text-primary">No streams yet</h2>
            <p className="mt-2 text-sm text-text-secondary">New vested token streams will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border-default bg-card">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_auto] gap-4 border-b border-border-default px-5 py-3 text-xs font-semibold uppercase text-text-muted">
                <span>Stream</span><span>Vesting progress</span><span>Status</span>
              </div>
              {streams.map((stream) => {
                const total = Number(stream.totalVested);
                const claimed = Number(stream.claimed);
                const progress = total > 0 ? Math.min(100, Math.round((claimed / total) * 100)) : 0;
                return (
                  <Link
                    key={stream.streamId}
                    href={`/streams/${encodeURIComponent(stream.streamId)}`}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_auto] items-center gap-4 border-b border-border-default px-5 py-4 last:border-b-0 hover:bg-bg-elevated"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-sm text-text-primary">{stream.streamId}</span>
                      <span className="mt-1 block truncate text-xs text-text-muted">Recipient {stream.recipient}</span>
                    </span>
                    <span>
                      <span className="block text-sm text-text-primary">{progress}% claimed</span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-bg-elevated">
                        <span className="block h-full bg-status-success" style={{ width: `${progress}%` }} />
                      </span>
                    </span>
                    <span className="rounded-full border border-border-default px-2.5 py-1 text-xs text-text-secondary">{stream.status}</span>
                  </Link>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 text-sm text-text-secondary">
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-md border border-border-default px-3 py-1.5 disabled:opacity-50">Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-md border border-border-default px-3 py-1.5 disabled:opacity-50">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
