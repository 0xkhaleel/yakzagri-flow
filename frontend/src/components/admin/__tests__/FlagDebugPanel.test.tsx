import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFlags } from "@/components/FeatureFlagsProvider";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { FLAG_CATALOG } from "@/lib/featureFlags";
import { FlagDebugPanel } from "../FlagDebugPanel";

jest.mock("@/components/FeatureFlagsProvider", () => ({
  useFlags: jest.fn(),
}));

jest.mock("@/hooks/useIsAdmin", () => ({
  useIsAdmin: jest.fn(),
}));

const mockUseFlags = useFlags as jest.MockedFunction<typeof useFlags>;
const mockUseIsAdmin = useIsAdmin as jest.MockedFunction<typeof useIsAdmin>;

function setup(isAdmin: boolean, isLoading = false) {
  const refresh = jest.fn();
  mockUseIsAdmin.mockReturnValue(isAdmin);
  mockUseFlags.mockReturnValue({
    ...FLAG_CATALOG,
    isLoading,
    isFeatureEnabled: jest.fn(),
    refresh,
  });
  return { refresh };
}

describe("FlagDebugPanel", () => {
  it("does not render for non-admin users", () => {
    setup(false);

    render(<FlagDebugPanel />);

    expect(screen.queryByTestId("flag-debug-panel")).not.toBeInTheDocument();
  });

  it("shows feature flags when an admin opens the panel", async () => {
    setup(true);
    const user = userEvent.setup();

    render(<FlagDebugPanel />);
    await user.click(screen.getByRole("button", { name: /open feature flags panel/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("flag-debug-row-adminUI")).toBeInTheDocument();
    expect(screen.getByTestId("flag-debug-row-tradeWizardV2")).toBeInTheDocument();
  });

  it("refreshes flags and disables refresh while loading", async () => {
    const { refresh } = setup(true);
    const user = userEvent.setup();

    const { rerender } = render(<FlagDebugPanel />);
    await user.click(screen.getByRole("button", { name: /open feature flags panel/i }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /refresh/i }));

    expect(refresh).toHaveBeenCalledTimes(1);

    setup(true, true);
    rerender(<FlagDebugPanel />);
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: /refresh/i })).toBeDisabled();
  });
});