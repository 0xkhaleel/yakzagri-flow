export type AppNetwork = "mainnet" | "testnet";
export type AppCurrency = "USD" | "EUR" | "GBP" | "NGN" | "cNGN";

export interface NotificationPreferences {
  tradeUpdates: boolean;
  disputeAlerts: boolean;
  vaultActivity: boolean;
  systemAnnouncements: boolean;
}

export interface AppPreferences {
  network: AppNetwork;
  currency: AppCurrency;
  autoSignOut: "15" | "30" | "60" | "never";
  notifications: NotificationPreferences;
}

export const PREFERENCES_STORAGE_KEY = "amana-preferences";
export const PREFERENCES_CHANGED_EVENT = "amana-preferences-changed";

export const DEFAULT_PREFERENCES: AppPreferences = {
  network: "testnet",
  currency: "NGN",
  autoSignOut: "30",
  notifications: {
    tradeUpdates: true,
    disputeAlerts: true,
    vaultActivity: false,
    systemAnnouncements: true,
  },
};

export function readPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<AppPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...parsed.notifications,
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(preferences: AppPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT));
}

export function readSavedNetwork(): AppNetwork | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) return null;
    const network = (JSON.parse(stored) as Partial<AppPreferences>).network;
    return network === "mainnet" || network === "testnet" ? network : null;
  } catch {
    return null;
  }
}

export function readSavedCurrency(): AppCurrency | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!stored) return null;
    const currency = (JSON.parse(stored) as Partial<AppPreferences>).currency;
    return currency === "USD" || currency === "EUR" || currency === "GBP" || currency === "NGN" || currency === "cNGN"
      ? currency
      : null;
  } catch {
    return null;
  }
}