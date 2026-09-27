"use client";

import { useMemo } from "react";
import { useFreighterIdentity } from "./useFreighterIdentity";
import { useAdmin } from "./useAdmin";
import { getAdminAddresses, isAdminAddress } from "@/lib/adminAccess";

/**
 * Whether the connected wallet address is on the admin allowlist.
 *
 * This is now a thin wrapper over the consolidated admin-auth hook
 * (`useAdmin`), which combines identity + allowlist + feature flag so there
 * is a single admin-auth source of truth. The allowlist check is preserved
 * here for callers that only need the address-based gate.
 */
export function useIsAdmin(): boolean {
  const { address } = useFreighterIdentity();
  const adminAddresses = useMemo(() => getAdminAddresses(), []);
  const { isAdmin } = useAdmin();

  return isAdmin || isAdminAddress(address, adminAddresses);
}
