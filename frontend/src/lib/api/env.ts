import { readSavedNetwork } from "@/lib/preferences";

const DEFAULT_API_BASE_URL = "http://localhost:4000";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
}

/**
 * Version prefix prepended to consumer-facing API paths.
 *
 * Defaults to `/api/v1` — the stable, versioned backend lane. Set to an empty
 * string (e.g. `NEXT_PUBLIC_API_VERSION_PREFIX=`) to keep calling the legacy
 * unversioned aliases. The backend serves both lanes, so reverting is a
 * no-deploy backend change.
 *
 * Admin (/admin, /api/admin) and health endpoints are always unversioned and
 * never receive this prefix.
 */
export function getApiVersionPrefix(): string {
  return process.env.NEXT_PUBLIC_API_VERSION_PREFIX || "/api/v1";
}

export function getStellarRpcUrl(): string {
  const network = readSavedNetwork();
  if (network === "mainnet") return "https://mainnet.sorobanrpc.com";
  if (network === "testnet") return "https://soroban-testnet.stellar.org";
  return (
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://soroban-testnet.stellar.org"
  );
}

export function getStellarNetworkPassphrase(): string {
  const network = readSavedNetwork();
  if (network === "mainnet") return "Public Global Stellar Network ; September 2015";
  const passphrase =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK ||
    "Test SDF Network ; September 2015";

  // Validate that it's a real passphrase, not a shorthand like 'testnet' or 'public'
  // Real passphrases contain separators (spaces, semicolons, periods) characteristic of full network names
  // e.g., "Test SDF Network ; September 2015", "Public Global Stellar Network ; September 2015"
  if (
    passphrase.toLowerCase() === "testnet" ||
    passphrase.toLowerCase() === "public" ||
    passphrase.toLowerCase() === "mainnet"
  ) {
    throw new Error(
      `Invalid Stellar network passphrase: "${passphrase}". ` +
      `Expected a full passphrase like "Test SDF Network ; September 2015" or "Public Global Stellar Network ; September 2015". ` +
      `Set NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE in your environment.`
    );
  }

  return passphrase;
}
