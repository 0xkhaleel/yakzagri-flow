import {
  generateIdempotencyKey,
  getOrCreateIdempotencyKey,
  clearIdempotencyKey,
  _clearAllIdempotencyKeysForTests,
} from "../idempotency";
import { shouldDedup, registerAction, _clearAllForTests, DEDUP_WINDOW } from "../actionDedup";

describe("Idempotency canonical key generator (ADR-004 / Issue #10)", () => {
  beforeEach(() => {
    _clearAllIdempotencyKeysForTests();
  });

  it("generateIdempotencyKey returns a non-empty string identifier", () => {
    const key = generateIdempotencyKey();
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("getOrCreateIdempotencyKey returns stable key across repeated submits for the same (userId, scope)", () => {
    const key1 = getOrCreateIdempotencyKey("user-1", "create-trade:step3");
    const key2 = getOrCreateIdempotencyKey("user-1", "create-trade:step3");
    expect(key1).toBe(key2);
  });

  it("supports tuple syntax getOrCreateIdempotencyKey([userId, scope])", () => {
    const key1 = getOrCreateIdempotencyKey(["user-2", "deposit:trade-456"]);
    const key2 = getOrCreateIdempotencyKey("user-2", "deposit:trade-456");
    expect(key1).toBe(key2);
  });

  it("supports single scope argument getOrCreateIdempotencyKey(scope)", () => {
    const key1 = getOrCreateIdempotencyKey("global-action");
    const key2 = getOrCreateIdempotencyKey("global-action");
    expect(key1).toBe(key2);
  });

  it("returns different keys for different scopes or users", () => {
    const keyUser1 = getOrCreateIdempotencyKey("user-1", "deposit:trade-100");
    const keyUser2 = getOrCreateIdempotencyKey("user-2", "deposit:trade-100");
    const keyDiffScope = getOrCreateIdempotencyKey("user-1", "release:trade-100");

    expect(keyUser1).not.toBe(keyUser2);
    expect(keyUser1).not.toBe(keyDiffScope);
  });

  it("clearIdempotencyKey removes key so a fresh key is generated on next submit", () => {
    const key1 = getOrCreateIdempotencyKey("user-1", "create-trade:step3");
    clearIdempotencyKey("user-1", "create-trade:step3");
    const key2 = getOrCreateIdempotencyKey("user-1", "create-trade:step3");

    expect(key1).not.toBe(key2);
  });
});

describe("Client dedup window matches backend lock TTL (30s)", () => {
  beforeEach(() => {
    _clearAllForTests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("aligns client dedup window with 30s backend lock TTL", () => {
    expect(DEDUP_WINDOW).toBe(30000);
  });

  it("deduplicates actions submitted within the 30s window", () => {
    const actionKey = "trade:action:1";
    registerAction(actionKey, "corr-1", "idem-1");

    expect(shouldDedup(actionKey).dedup).toBe(true);

    // After 29s, still within dedup window
    jest.advanceTimersByTime(29000);
    expect(shouldDedup(actionKey).dedup).toBe(true);

    // After 30s TTL, dedup window expires
    jest.advanceTimersByTime(2000);
    expect(shouldDedup(actionKey).dedup).toBe(false);
  });
});
