import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/dashboard/page";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

jest.mock("@/hooks/useAuth");
jest.mock("@/lib/api", () => ({
  api: { trades: { getStats: jest.fn(), list: jest.fn() } },
  ApiError: class ApiError extends Error {},
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetStats = api.trades.getStats as jest.MockedFunction<typeof api.trades.getStats>;
const mockListTrades = api.trades.list as jest.MockedFunction<typeof api.trades.list>;

function makeTrade(status: string, tradeId: string) {
  return {
    tradeId,
    buyerAddress: "buyer",
    sellerAddress: "seller",
    amountCngn: "100",
    buyerLossBps: 0,
    sellerLossBps: 0,
    status,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("Dashboard completed trade count", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "token", isAuthenticated: true } as ReturnType<typeof useAuth>);
    mockGetStats.mockResolvedValue({ totalTrades: 5, totalVolume: 500, openTrades: 1 });
    mockListTrades
      .mockResolvedValueOnce({
        items: [
          makeTrade("PENDING", "a"),
          makeTrade("DISPUTED", "b"),
          makeTrade("SETTLED", "c"),
        ],
        pagination: { page: 1, limit: 100, total: 5, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        items: [makeTrade("IN_DELIVERY", "d"), makeTrade("SETTLED", "e")],
        pagination: { page: 2, limit: 100, total: 5, totalPages: 2 },
      });
  });

  it("counts settled trades rather than subtracting open trades from total", async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(mockListTrades).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("2", { exact: true })).toBeInTheDocument();
  });
});