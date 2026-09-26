import { mapHistoryToTimeline, mapHistoryToTransactionTimeline } from "../[id]/page";

describe("Asset page history mapping", () => {
  const sampleEvent = {
    eventType: "trade_funded",
    timestamp: "2024-01-02T12:00:00.000Z",
    actor: "system",
    metadata: { amount: 1000 },
  } as const;

  it("preserves ISO timestamps for timeline rendering", () => {
    const result = mapHistoryToTimeline([sampleEvent]);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(sampleEvent.timestamp);
    expect(result[0].title).toBe("Trade Funded");
  });

  it("preserves ISO timestamps for transaction timeline rendering", () => {
    const result = mapHistoryToTransactionTimeline([sampleEvent]);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(sampleEvent.timestamp);
    expect(result[0].actor).toBe("system");
    expect(result[0].description).toBe("Escrow funds were deposited and locked. Amount: 1000.");
    expect(result[0].status).toBe("completed");
  });

  it("derives transaction state from event metadata", () => {
    const result = mapHistoryToTransactionTimeline([
      { ...sampleEvent, eventType: "funds_release", metadata: { status: "processing" } },
      { ...sampleEvent, eventType: "trade_pending", metadata: { reason: "Awaiting buyer signature" } },
      { ...sampleEvent, eventType: "transaction_failed", metadata: { status: "failed" } },
    ]);

    expect(result[0].status).toBe("active");
    expect(result[0].description).toBe("funds release was recorded.");
    expect(result[1].status).toBe("pending");
    expect(result[1].description).toBe("Awaiting buyer signature");
    expect(result[2].status).toBe("failed");
  });
});
