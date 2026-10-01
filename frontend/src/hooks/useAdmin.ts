"use client";

import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { useFreighterIdentity } from "./useFreighterIdentity";
import { getAdminAddresses, isAdminAddress } from "@/lib/adminAccess";
import { isAdminUIEnabled } from "@/lib/featureFlags";

interface UseAdminResult {
  isAdmin: boolean;
  isAdminUIEnabled: boolean;
  canAccessAdmin: boolean;
  adminAddresses: string[];
  isLoading: boolean;
}

/**
 * Single source of truth for admin authorization.
 *
 * Combines the three previously-divergent signals:
 * - identity: the authenticated address from `useAuth`, falling back to the
 *   Freighter identity when `useAuth` has no address (keeps the allowlist-only
 *   behavior that `useIsAdmin` relied on).
 * - allowlist: `NEXT_PUBLIC_ADMIN_WALLETS` via `getAdminAddresses`.
 * - feature flag: `isAdminUIEnabled`.
 *
 * `isAdmin` reflects allowlist membership regardless of the feature flag, so
 * pages that gated on `useIsAdmin` keep working; `canAccessAdmin` additionally
 * requires the feature flag, preserving the `useAdmin` gating behavior.
 */
export function useAdmin(): UseAdminResult {
  const { address, isLoading } = useAuth();
  const { address: freighterAddress } = useFreighterIdentity();

  const adminAddresses = useMemo(() => {
    return getAdminAddresses();
  }, []);

  // Prefer the auth address, but fall back to the Freighter identity so both
  // identity sources resolve to a single admin-auth source of truth.
  const identityAddress = address ?? freighterAddress ?? null;

  const isAdmin = useMemo(() => {
    return isAdminAddress(identityAddress, adminAddresses);
  }, [identityAddress, adminAddresses]);

  const adminUIEnabled = useMemo(() => {
    return isAdminUIEnabled();
  }, []);

  // User can access admin features only if they're an admin AND the feature flag is enabled
  const canAccessAdmin = isAdmin && adminUIEnabled;

  return {
    isAdmin,
    isAdminUIEnabled: adminUIEnabled,
    canAccessAdmin,
    adminAddresses,
    isLoading,
  };
}
