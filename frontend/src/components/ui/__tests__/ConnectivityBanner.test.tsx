import { render, waitFor } from "@testing-library/react";
import { signTransaction } from "@stellar/freighter-api";
import { api } from "@/lib/api";
import { useOfflineQueueStore } from "@/stores/offlineQueueStore";
import { ConnectivityBanner } from "../ConnectivityBanner";

jest.mock("@/hooks/useOffline", () => ({
  useOffline: () => ({
    isOffline: false,
    wasOffline: true,
    retryOnline: jest.fn(),
  }),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ token: "test-token" }),
}));

jest.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    addToast: jest.fn(),
    addToastWithCorrelation: jest.fn(),
  }),
}));

jest.mock("@/lib/api/client", () => ({ request: jest.fn() }));

jest.mock("@/lib/api", () => ({
  api: { trades: { create: jest.fn() } },
  apiConfig: {
    getStellarNetworkPassphrase: jest.fn(() => "test-network"),
    getStellarRpcUrl: jest.fn(() => "https://stellar.example/rpc"),
  },
}));

jest.mock("@stellar/freighter-api", () => ({
  signTransaction: jest.fn(),
}));

const mockedCreateTrade = api.trades.create as jest.MockedFunction<
  typeof api.trades.create
>;
const mockedSignTransaction = signTransaction as jest.MockedFunction<
  typeof signTransaction
>;

describe("ConnectivityBanner queued trade replay", () => {
  beforeEach(() => {
    localStorage.clear();
    useOfflineQueueStore.setState({ queue: [], isOnline: true });
    jest.clearAllMocks();
    mockedCreateTrade.mockResolvedValue({
      tradeId: "trade-123",
      unsignedXdr: "unsigned-xdr",
    });
    mockedSignTransaction.mockResolvedValue({
      signedTxXdr: "signed-xdr",
      signerAddress: "GTEST",
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ result: { hash: "tx-hash-123" } }),
    } as unknown as Response);
  });

  it("creates, signs, and submits the escrow transaction before dequeuing", async () => {
    const payload = {
      sellerAddress: "GSELLER",
      amountUsdc: "500.0000000",
      buyerLossBps: 5000,
      sellerLossBps: 5000,
    };
    const action = useOfflineQueueStore.getState().enqueue({
      type: "create-trade",
      endpoint: "/trades",
      method: "POST",
      body: payload,
      idempotencyKey: "trade-key",
      correlationId: "trade-correlation",
    });

    render(<ConnectivityBanner />);

    await waitFor(() =>
      expect(useOfflineQueueStore.getState().queue).toHaveLength(0),
    );

    expect(mockedCreateTrade).toHaveBeenCalledWith("test-token", payload, {
      idempotencyKey: action.idempotencyKey,
      correlationId: action.correlationId,
    });
    expect(mockedSignTransaction).toHaveBeenCalledWith("unsigned-xdr", {
      networkPassphrase: "test-network",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://stellar.example/rpc",
      expect.objectContaining({
        body: expect.stringContaining("signed-xdr"),
      }),
    );
  });
});
