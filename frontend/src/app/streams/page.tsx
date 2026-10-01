"use client";
import { t as translateCopy } from "@/lib/i18n";


import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { api, ApiError, type AdminStreamSummary } from "@/lib/api";
import { Breadcrumbs } from "@/components/ui";

export default function StreamsPage() {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
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
    if (isAuthenticated && canAccessAdmin) {
      queueMicrotask(() => void fetchStreams());
    } else {
      queueMicrotask(() => setLoading(false));
    }
  }, [authLoading, isAuthenticated, canAccessAdmin, fetchStreams]);

  const breadcrumbItems = [
    { label: "Home", path: "/" },
    { label: "Streams" },
  ];

  return (
    <section className="min-h-full bg-bg-primary px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Breadcrumb */}
        <Breadcrumbs items={breadcrumbItems} />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">{translateCopy("ui.vested_token_streams_dc596f5")}</h1>
            <p className="mt-0.5 text-xs text-text-secondary">
              {translateCopy("ui.view_and_manage_your_vested_toke_6d8d645")}
            </p>
          </div>
        </div>

        {/* Coming soon placeholder */}
        {!canAccessAdmin ? (
          <>
        <div className="rounded-2xl border border-border-default bg-card p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-medium text-text-primary">{translateCopy("ui.stream_list_coming_soon_b52faaf")}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {translateCopy("ui.stream_listing_and_filtering_fea_e64ecf9")}
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex rounded-lg border border-border-default bg-bg-elevated px-4 py-2 text-sm font-medium text-text-secondary hover:border-border-hover hover:bg-card hover:text-text-primary transition-colors"
            >
              {translateCopy("ui.back_to_home_ce7472d")}
            </Link>
          </div>
        </div>

        {/* Example stream navigation */}
        <div className="rounded-2xl border border-border-default bg-card p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-text-secondary mb-3">
            {translateCopy("ui.quick_access_85257a4")}
          </p>
          <p className="text-sm text-text-muted mb-4">
            Use a real stream ID from your connected wallet or the stream overview to open a detail page.
          </p>
          <div className="flex gap-3">
            <Link
              href="/admin/streams"
              className="rounded-lg border border-border-default bg-bg-elevated px-4 py-2 text-sm font-medium text-text-secondary hover:border-border-hover hover:bg-card hover:text-text-primary transition-colors"
            >
              View Stream Ledger
            </Link>
          </div>
        </div>
          </>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border-default bg-card">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_auto] gap-4 border-b border-border-default px-5 py-3 text-xs font-semibold uppercase text-text-muted">
                <span>{translateCopy("ui.stream_column")}</span><span>{translateCopy("ui.vesting_progress_column")}</span><span>{translateCopy("ui.status_column")}</span>
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
                      <span className="mt-1 block truncate text-xs text-text-muted">{translateCopy("ui.stream_recipient", { recipient: stream.recipient })}</span>
                    </span>
                    <span>
                      <span className="block text-sm text-text-primary">{translateCopy("ui.stream_progress_claimed", { progress })}</span>
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
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-md border border-border-default px-3 py-1.5 disabled:opacity-50">{translateCopy("ui.previous_50f9428")}</button>
                <span>{translateCopy("ui.page_pagination_label", { page, totalPages })}</span>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-md border border-border-default px-3 py-1.5 disabled:opacity-50">{translateCopy("ui.next_bc98198")}</button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
