const DEFAULT_ADMIN_ADDRESSES: string[] = [];

/** Reads the admin wallet allowlist from env; no dev fallback (admin access defaults to nobody). */
export function getAdminAddresses(
  envValue: string | undefined = process.env.NEXT_PUBLIC_ADMIN_WALLETS,
): string[] {
  const fromEnv = (envValue ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : DEFAULT_ADMIN_ADDRESSES;
}

export function isAdminAddress(
  address: string | null | undefined,
  adminAddresses: string[],
): boolean {
  return Boolean(address && adminAddresses.includes(address));
}

/**
 * Server-side admin gate used by middleware for `/admin/*` requests.
 *
 * The client-side gate in `app/admin/layout.tsx` only runs after the page
 * bundle is served, so it cannot stop direct requests to admin routes. This
 * helper lets middleware reject unauthenticated requests before any admin
 * server component or bundle is produced.
 *
 * A request is considered authenticated when it carries the auth cookie and
 * the wallet address it identifies is present in the admin allowlist.
 */
export const AUTH_COOKIE_NAME = "auth_token";

export function isAdminRequest(
  cookieValue: string | null | undefined,
  adminAddresses: string[] = getAdminAddresses(),
): boolean {
  if (!cookieValue) {
    return false;
  }

  const address = decodeAuthCookie(cookieValue);
  return isAdminAddress(address, adminAddresses);
}

/**
 * Extracts the wallet address from the auth cookie value. Supports a raw
 * address as well as a JSON payload (`{ address }`) so the gate works with
 * either cookie shape without changing how the cookie is written elsewhere.
 */
export function decodeAuthCookie(cookieValue: string): string | null {
  const value = cookieValue.trim();
  if (!value) {
    return null;
  }

  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as { address?: unknown };
      return typeof parsed.address === "string" ? parsed.address : null;
    } catch {
      return null;
    }
  }

  return value;
}
