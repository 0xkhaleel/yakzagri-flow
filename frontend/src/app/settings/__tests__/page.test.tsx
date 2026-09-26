import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/settings/page";
import { PREFERENCES_STORAGE_KEY } from "@/lib/preferences";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    address: null,
    isAuthenticated: false,
    isWalletConnected: false,
    isWalletDetected: false,
    isLoading: false,
    connectWallet: jest.fn(),
    authenticate: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe("Settings preferences", () => {
  beforeEach(() => localStorage.clear());

  it("saves the selected currency and notification settings", async () => {
    render(<SettingsPage />);

    const currency = await screen.findByRole("combobox", { name: "Preferred currency" });
    fireEvent.change(currency, { target: { value: "cNGN" } });
    fireEvent.click(screen.getByRole("switch", { name: "Trade updates" }));
    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}");
      expect(saved.currency).toBe("cNGN");
      expect(saved.notifications.tradeUpdates).toBe(false);
    });
  });
});