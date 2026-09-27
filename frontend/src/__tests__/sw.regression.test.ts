/**
 * Regression tests for Service Worker fetch handling (#7)
 *
 * Verifies that:
 * 1. POST and OPTIONS requests (mutations & CORS preflights) bypass Cache API
 * 2. Cache.put() is never called with non-GET requests (which throws TypeError in Cache API)
 * 3. Network responses for POST and OPTIONS succeed and never return 503 offline JSON
 * 4. GET requests still use networkFirstWithCache as intended
 */

// Import sw functions
const {
  networkFirstWithCache,
  handleFetch,
  API_CACHE_NAME,
} = require("../../public/sw.js");

if (typeof (global as any).ReadableStream === "undefined") {
  (global as any).ReadableStream = require("stream/web").ReadableStream;
}
const undici = require("undici");
const UndiciResponse = undici.Response;
const UndiciRequest = undici.Request;
(global as any).Response = UndiciResponse;
(global as any).Request = UndiciRequest;
(global as any).Headers = undici.Headers;

describe("Service Worker POST/OPTIONS regression tests (#7)", () => {
  let mockCachePut: jest.Mock;
  let mockCacheMatch: jest.Mock;
  let mockCachesOpen: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCachePut = jest.fn().mockImplementation((req: Request) => {
      // Per W3C Cache API specification, calling put() with non-GET throws TypeError
      const method = (req && req.method) || "GET";
      if (method !== "GET") {
        throw new TypeError(`Request method '${method}' is unsupported`);
      }
      return Promise.resolve();
    });

    mockCacheMatch = jest.fn().mockResolvedValue(null);

    const mockCache = {
      put: mockCachePut,
      match: mockCacheMatch,
    };

    mockCachesOpen = jest.fn().mockResolvedValue(mockCache);

    (global as any).caches = {
      open: mockCachesOpen,
      match: mockCacheMatch,
    };

    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  describe("networkFirstWithCache — non-GET mutations & preflights", () => {
    it("handles POST trade creation without attempting cache.put and returns 201", async () => {
      const payload = { tradeId: "trade-new-123", amountCngn: "5000" };
      const expectedResponse = new UndiciResponse(JSON.stringify(payload), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
      mockFetch.mockResolvedValue(expectedResponse);

      const request = new UndiciRequest("http://localhost:3000/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await networkFirstWithCache(request);

      expect(response.status).toBe(201);
      expect(mockCachePut).not.toHaveBeenCalled();
      const body = await response.json();
      expect(body).toEqual(payload);
      expect(body.offline).toBeUndefined();
    });

    it("handles POST /trades/:id/deposit without returning 503 offline JSON", async () => {
      const depositResponse = new UndiciResponse(
        JSON.stringify({ unsignedXdr: "deposit-xdr-data" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      mockFetch.mockResolvedValue(depositResponse);

      const request = new UndiciRequest(
        "http://localhost:3000/trades/trade-123/deposit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await networkFirstWithCache(request);

      expect(response.status).toBe(200);
      expect(mockCachePut).not.toHaveBeenCalled();
      const body = await response.json();
      expect(body.unsignedXdr).toBe("deposit-xdr-data");
      expect(body.offline).toBeUndefined();
    });

    it("handles POST /trades/:id/confirm without returning 503 offline JSON", async () => {
      const confirmResponse = new UndiciResponse(
        JSON.stringify({ unsignedXdr: "confirm-xdr-data" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      mockFetch.mockResolvedValue(confirmResponse);

      const request = new UndiciRequest(
        "http://localhost:3000/trades/trade-123/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await networkFirstWithCache(request);

      expect(response.status).toBe(200);
      expect(mockCachePut).not.toHaveBeenCalled();
      const body = await response.json();
      expect(body.unsignedXdr).toBe("confirm-xdr-data");
      expect(body.offline).toBeUndefined();
    });

    it("handles POST /trades/:id/release without returning 503 offline JSON", async () => {
      const releaseResponse = new UndiciResponse(
        JSON.stringify({ unsignedXdr: "release-xdr-data" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      mockFetch.mockResolvedValue(releaseResponse);

      const request = new UndiciRequest(
        "http://localhost:3000/trades/trade-123/release",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await networkFirstWithCache(request);

      expect(response.status).toBe(200);
      expect(mockCachePut).not.toHaveBeenCalled();
      const body = await response.json();
      expect(body.unsignedXdr).toBe("release-xdr-data");
      expect(body.offline).toBeUndefined();
    });

    it("handles POST /trades/:id/dispute without returning 503 offline JSON", async () => {
      const disputeResponse = new UndiciResponse(
        JSON.stringify({ unsignedXdr: "dispute-xdr-data" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      mockFetch.mockResolvedValue(disputeResponse);

      const request = new UndiciRequest(
        "http://localhost:3000/trades/trade-123/dispute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Disputed goods", category: "quality" }),
        }
      );

      const response = await networkFirstWithCache(request);

      expect(response.status).toBe(200);
      expect(mockCachePut).not.toHaveBeenCalled();
      const body = await response.json();
      expect(body.unsignedXdr).toBe("dispute-xdr-data");
      expect(body.offline).toBeUndefined();
    });

    it("handles OPTIONS preflight request without calling cache.put and returns 204", async () => {
      const optionsResponse = new UndiciResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
      });
      mockFetch.mockResolvedValue(optionsResponse);

      const request = new UndiciRequest("http://localhost:3000/api/trades", {
        method: "OPTIONS",
      });

      const response = await networkFirstWithCache(request);

      expect(response.status).toBe(204);
      expect(mockCachePut).not.toHaveBeenCalled();
    });

    it("returns 503 offline JSON when network actually fails for non-GET", async () => {
      mockFetch.mockRejectedValue(new Error("Failed to fetch"));

      const request = new UndiciRequest("http://localhost:3000/api/trades", {
        method: "POST",
        body: JSON.stringify({ amount: "100" }),
      });

      const response = await networkFirstWithCache(request);

      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.offline).toBe(true);
      expect(body.error).toBe("You are offline");
      expect(mockCachePut).not.toHaveBeenCalled();
    });
  });

  describe("networkFirstWithCache — GET requests", () => {
    it("caches successful GET requests using cache.put", async () => {
      const tradeData = { tradeId: "trade-123", status: "FUNDED" };
      const getResponse = new UndiciResponse(JSON.stringify(tradeData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      mockFetch.mockResolvedValue(getResponse);

      const request = new UndiciRequest("http://localhost:3000/api/trades/trade-123", {
        method: "GET",
      });

      const response = await networkFirstWithCache(request);

      expect(response.status).toBe(200);
      expect(mockCachesOpen).toHaveBeenCalledWith(API_CACHE_NAME);
      expect(mockCachePut).toHaveBeenCalledTimes(1);
    });

    it("falls back to cache when network fails for GET request", async () => {
      mockFetch.mockRejectedValue(new Error("Network offline"));

      const cachedResponse = new UndiciResponse(
        JSON.stringify({ tradeId: "trade-123", fromCache: true }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-amana-cache-time": String(Date.now()),
          },
        }
      );
      mockCacheMatch.mockResolvedValue(cachedResponse);

      const request = new UndiciRequest("http://localhost:3000/api/trades/trade-123", {
        method: "GET",
      });

      const response = await networkFirstWithCache(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.fromCache).toBe(true);
    });
  });

  describe("handleFetch (SW fetch event listener)", () => {
    it("intercepts POST /api/trades and responds with network response", async () => {
      const responseData = { success: true, tradeId: "t-100" };
      mockFetch.mockResolvedValue(
        new UndiciResponse(JSON.stringify(responseData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      let interceptedPromise: Promise<Response> | null = null;
      const fakeEvent = {
        request: new UndiciRequest("http://localhost:3000/api/trades", {
          method: "POST",
          body: JSON.stringify({ amount: "200" }),
        }),
        respondWith: jest.fn((p) => {
          interceptedPromise = p;
        }),
      };

      handleFetch(fakeEvent);

      expect(fakeEvent.respondWith).toHaveBeenCalled();
      const resolvedResponse = await interceptedPromise!;
      expect(resolvedResponse.status).toBe(200);
      const body = await resolvedResponse.json();
      expect(body).toEqual(responseData);
      expect(mockCachePut).not.toHaveBeenCalled();
    });

    it("intercepts OPTIONS /api/trades and responds with network response", async () => {
      mockFetch.mockResolvedValue(new UndiciResponse(null, { status: 204 }));

      let interceptedPromise: Promise<Response> | null = null;
      const fakeEvent = {
        request: new UndiciRequest("http://localhost:3000/api/trades", {
          method: "OPTIONS",
        }),
        respondWith: jest.fn((p) => {
          interceptedPromise = p;
        }),
      };

      handleFetch(fakeEvent);

      expect(fakeEvent.respondWith).toHaveBeenCalled();
      const resolvedResponse = await interceptedPromise!;
      expect(resolvedResponse.status).toBe(204);
      expect(mockCachePut).not.toHaveBeenCalled();
    });
  });
});
