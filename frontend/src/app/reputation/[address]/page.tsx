"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type ReputationResponse } from "@/lib/api";

export default function UserReputationPage() {
  const params = useParams<{ address: string }>();
  const address = params.address;
  const [data, setData] = useState<ReputationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.reputation.getUserReputation(address)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch(() => {
        if (!cancelled) setError("Reputation details could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <Link href="/reputation" className="text-sm text-text-secondary hover:text-text-primary">
        Back to reputation
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Trader Reputation</h1>
        <p className="mt-1 break-all font-mono text-sm text-text-secondary">{address}</p>
      </div>
      {error ? (
        <p role="alert" className="rounded-lg border border-status-danger/40 px-4 py-3 text-sm text-status-danger">
          {error}
        </p>
      ) : data ? (
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Trust score", `${data.trustScore}%`],
            ["Total trades", data.totalTrades],
            ["Completed", data.completedTrades],
            ["Disputed", data.disputedTrades],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border-default bg-bg-card p-4">
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className="mt-2 text-xl font-semibold text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role="status" className="text-sm text-text-secondary">Loading reputation…</p>
      )}
    </section>
  );
}