import { getStellarNetworkPassphrase, getStellarRpcUrl } from "@/lib/api/env";
import { formatMoney } from "@/lib/i18n/format";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  writePreferences,
} from "@/lib/preferences";

describe("saved application preferences", () => {
  beforeEach(() => localStorage.clear());

  it("persists notification and display preferences", () => {
    const preferences = {
      ...DEFAULT_PREFERENCES,
      currency: "cNGN" as const,
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        tradeUpdates: false,
      },
    };

    writePreferences(preferences);

    expect(readPreferences()).toEqual(preferences);
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).not.toBeNull();
    expect(formatMoney(1234.56, { locale: "en-NG" })).toBe("1,234.56 cNGN");
  });

  it("uses the selected Stellar network for wallet signing configuration", () => {
    writePreferences({ ...DEFAULT_PREFERENCES, network: "mainnet" });

    expect(getStellarRpcUrl()).toBe("https://mainnet.sorobanrpc.com");
    expect(getStellarNetworkPassphrase()).toBe(
      "Public Global Stellar Network ; September 2015",
    );
  });
});