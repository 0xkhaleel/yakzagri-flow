import { fireEvent, render, screen } from "@testing-library/react";
import { AppTopNav } from "../AppTopNav";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { DEFAULT_PREFERENCES, writePreferences } from "@/lib/preferences";

const mockPush = jest.fn();
const mockFetch = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/hooks/useIsAdmin");
jest.mock("@/components/GlobalSearch", () => ({
  GlobalSearch: () => null,
}));
jest.mock("@/stores/notificationStore", () => ({
  useNotificationStore: {
    getState: () => ({ fetch: mockFetch }),
  },
}));

const mockUseIsAdmin = useIsAdmin as jest.MockedFunction<typeof useIsAdmin>;

describe("AppTopNav admin role indicator", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockFetch.mockClear();
  });

  it("shows an Admin badge when the connected wallet is an admin", () => {
    mockUseIsAdmin.mockReturnValue(true);

    render(<AppTopNav />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("hides the Admin badge for non-admin users", () => {
    mockUseIsAdmin.mockReturnValue(false);

    render(<AppTopNav />);

    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("renders accessible actions for notifications and profile", () => {
    mockUseIsAdmin.mockReturnValue(false);

    render(<AppTopNav />);

    const bell = screen.getByRole("button", { name: /open notifications/i });
    const avatar = screen.getByRole("button", { name: /open account settings/i });

    expect(bell).toBeInTheDocument();
    expect(avatar).toBeInTheDocument();

    fireEvent.click(bell);
    fireEvent.click(avatar);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });

  it("disables notifications when all notification preferences are off", () => {
    writePreferences({
      ...DEFAULT_PREFERENCES,
      notifications: {
        tradeUpdates: false,
        disputeAlerts: false,
        vaultActivity: false,
        systemAnnouncements: false,
      },
    });
    mockUseIsAdmin.mockReturnValue(false);

    render(<AppTopNav />);

    expect(screen.getByRole("button", { name: /open notifications/i })).toBeDisabled();
  });
});
