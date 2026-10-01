import { formatDate as formatLocalizedDate } from "@/lib/i18n";

const DEFAULT_MEDIATOR_ADDRESSES = ["GEXAMPLEMEDIATORPUBLICKEY1"];

/**
 * True when the app is running in a non-production environment.
 * Production builds must never fall back to placeholder credentials.
 */
export function isNonProductionEnv(
  appEnv: string | undefined = process.env.NEXT_PUBLIC_APP_ENV,
): boolean {
  return (appEnv ?? "").trim().toLowerCase() !== "production";
}

/** Reads the mediator wallet allowlist from env, falling back to a dev default only outside production. */
export function getMediatorAddresses(
  envValue: string | undefined = process.env.NEXT_PUBLIC_MEDIATOR_WALLETS,
  appEnv: string | undefined = process.env.NEXT_PUBLIC_APP_ENV,
): string[] {
  const fromEnv = (envValue ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  // Fail closed in production: no placeholder mediator addresses.
  return isNonProductionEnv(appEnv) ? DEFAULT_MEDIATOR_ADDRESSES : [];
}

export function isMediatorAddress(
  address: string | null | undefined,
  mediatorAddresses: string[],
): boolean {
  return Boolean(address && mediatorAddresses.includes(address));
}

/** Formats an ISO date string using the active locale for dispute list rows. */
export function formatDate(dateString: string): string {
  return formatLocalizedDate(dateString);
}

/** Truncates a Stellar wallet address to "GABC...WXYZ"; short strings pass through untouched. */
export function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
