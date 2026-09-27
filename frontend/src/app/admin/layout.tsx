"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/hooks/useAdmin";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

/**
 * Layout for every page under `/admin`. Wraps the route guard (redirects
 * unauthenticated/non-admin callers away before admin content renders) and
 * the ErrorBoundary so an unexpected error on an admin page shows a
 * recoverable fallback instead of crashing the app shell.
 *
 * Gating uses the consolidated `useAdmin` hook (identity + allowlist +
 * feature flag) so admin access has a single source of truth.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAdmin, isLoading } = useAdmin();

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin) {
      router.replace("/access-denied");
    }
  }, [isLoading, isAdmin, router]);

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <ErrorBoundary backLabel="Back to admin" backHref="/admin">
      {children}
    </ErrorBoundary>
  );
}
