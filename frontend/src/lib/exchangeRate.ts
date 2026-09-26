/**
 * Exchange rate configuration.
 * Single source of truth for NGN/cNGN conversion rates.
 *
 * The backend should provide rate quotes, but this allows for fallback values
 * and environment-based overrides for testing/offline scenarios.
 */

/**
 * Default NGN to cNGN conversion rate (fallback).
 * Source: Should be synced from backend quote endpoint.
 * This default is used when the backend is unavailable.
 */
const DEFAULT_NGN_TO_CNGN_RATE = 1580;

/**
 * Get the NGN to cNGN exchange rate.
 * Reads from environment or returns the default.
 *
 * In production, this should be driven by a backend rate endpoint
 * rather than a hardcoded env value. This is a fallback mechanism.
 */
export function getNgnExchangeRate(): number {
  const envRate = process.env.NEXT_PUBLIC_NGN_EXCHANGE_RATE;
  if (envRate) {
    const rate = parseFloat(envRate);
    if (!isNaN(rate) && rate > 0) {
      return rate;
    }
  }
  return DEFAULT_NGN_TO_CNGN_RATE;
}

/**
 * Convert cNGN to NGN using the current exchange rate.
 */
export function convertCngnToNgn(cngn: number): number {
  return Math.round(cngn * getNgnExchangeRate());
}

/**
 * Convert NGN to cNGN using the current exchange rate.
 */
export function convertNgnToCngn(ngn: number): number {
  const rate = getNgnExchangeRate();
  return rate > 0 ? ngn / rate : 0;
}
