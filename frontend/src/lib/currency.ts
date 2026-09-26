/**
 * Unified currency representation and formatting.
 * Single source of truth for currency codes, symbols, and decimal places.
 */

import { getAssetInfo } from "@/lib/stellar/assets";

export interface CurrencyInfo {
  code: string;
  symbol: string;
  decimals: number;
  name: string;
}

/**
 * Canonical currency definitions used throughout the app.
 * Map internal codes (NGN, cNGN) to display symbols.
 */
const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    decimals: 2,
    name: "Nigerian Naira",
  },
  cNGN: {
    code: "cNGN",
    symbol: "USDC",
    decimals: 7,
    name: "USD Coin (cNGN on Stellar)",
  },
};

/**
 * Get canonical currency info by code.
 * Falls back to asset info if not in CURRENCY_MAP.
 */
export function getCurrencyInfo(code: string | null | undefined): CurrencyInfo {
  if (!code) {
    return CURRENCY_MAP.cNGN;
  }

  if (code in CURRENCY_MAP) {
    return CURRENCY_MAP[code];
  }

  // Fallback to stellar asset info
  const asset = getAssetInfo(code);
  return {
    code: asset.code,
    symbol: asset.symbol,
    decimals: asset.decimals,
    name: asset.name,
  };
}

/**
 * Get the display symbol for a currency code.
 */
export function getCurrencySymbol(code: string | null | undefined): string {
  return getCurrencyInfo(code).symbol;
}

/**
 * Get the decimal places for a currency code.
 */
export function getCurrencyDecimals(code: string | null | undefined): number {
  return getCurrencyInfo(code).decimals;
}

/**
 * Format a currency code for display (e.g., "cNGN" shows as "USDC").
 */
export function formatCurrencyCode(code: string | null | undefined): string {
  const info = getCurrencyInfo(code);
  return info.code;
}

/**
 * Format an amount with currency symbol and decimals.
 * @param amount The numeric amount
 * @param currencyCode The currency code (NGN, cNGN, etc.)
 * @param opts Options for formatting
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string | null | undefined,
  opts?: {
    showSymbol?: boolean;
    showCode?: boolean;
    grouping?: boolean;
  }
): string {
  const currency = getCurrencyInfo(currencyCode);
  const formatted = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
    useGrouping: opts?.grouping !== false,
  }).format(amount);

  if (opts?.showSymbol) {
    return `${currency.symbol}${formatted}`;
  }
  if (opts?.showCode) {
    return `${formatted} ${currency.code}`;
  }
  return formatted;
}
