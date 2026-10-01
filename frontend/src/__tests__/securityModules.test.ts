import { POST as cspReport } from "@/app/api/csp-report/route";
import { GET as getFlags } from "@/app/api/flags/route";
import { buildConnectSrc, buildCsp, buildFrameSrc } from "@/middleware";
import { reportBoundaryError } from "@/lib/errorReporter";
import { TracedHttpClient } from "@/lib/traced-fetch";

const originalFetch = global.fetch;

describe("security-sensitive modules", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it("builds CSP directives with nonce, connect origins, and configured wallet frames", () => {
    const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
    const originalAllowlist = process.env.WALLET_FRAME_ALLOWLIST;
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/v1";
    process.env.WALLET_FRAME_ALLOWLIST = "https://wallet.example.test, https://sign.example.test";

    try {
      const connectSrc = buildConnectSrc();
      const csp = buildCsp("nonce-value");

      expect(connectSrc).toContain("'self'");
      expect(connectSrc).toContain("https://api.example.test");
      expect(connectSrc).toContain("wss://api.example.test");
      expect(buildFrameSrc()).toBe("'self' https://wallet.example.test https://sign.example.test");
      expect(csp).toContain("script-src 'self' 'nonce-nonce-value' 'strict-dynamic'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("report-uri /api/csp-report");
    } finally {
      if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
      else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
      if (originalAllowlist === undefined) delete process.env.WALLET_FRAME_ALLOWLIST;
      else process.env.WALLET_FRAME_ALLOWLIST = originalAllowlist;
    }
  });

  it("accepts legacy and Reporting API CSP reports and ignores malformed JSON", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const legacyRequest = {
      json: async () => ({ "csp-report": { "blocked-uri": "https://bad.test" } }),
    };
    const reportingRequest = {
      json: async () => [{ body: { blockedURL: "https://bad.test" } }],
    };

    expect((await cspReport(legacyRequest as never)).status).toBe(204);
    expect((await cspReport(reportingRequest as never)).status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(
      (await cspReport(
        { json: async () => { throw new Error("invalid JSON"); } } as never,
      )).status,
    ).toBe(204);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("prefers backend flags and falls back to environment defaults after a fetch failure", async () => {
    const originalAdminFlag = process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI;
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI = "false";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ flags: { adminUI: { enabled: true }, unknownFlag: { enabled: true } } }),
    } as Response);
    global.fetch = fetchMock;

    try {
      const backendResponse = await getFlags();
      const backendBody = await backendResponse.json();
      expect(backendBody.flags.adminUI).toBe(true);
      expect(backendBody.flags).not.toHaveProperty("unknownFlag");
      expect(backendResponse.headers.get("Cache-Control")).toContain("stale-while-revalidate=25");

      fetchMock.mockRejectedValueOnce(new Error("backend unavailable"));
      process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI = "true";
      const fallbackBody = await (await getFlags()).json();
      expect(fallbackBody.flags.adminUI).toBe(true);
      expect(fallbackBody.flags.offlineBanner).toBe(true);
    } finally {
      if (originalAdminFlag === undefined) delete process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI;
      else process.env.NEXT_PUBLIC_ENABLE_ADMIN_UI = originalAdminFlag;
    }
  });

  it("sends structured production boundary reports", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const fetchMock = jest.fn().mockResolvedValue({ ok: true } as Response);
    global.fetch = fetchMock;

    try {
      reportBoundaryError({
        error: new Error("render failed"),
        componentStack: " at Widget",
        correlationId: "corr-123",
        route: "/dashboard",
        meta: { source: "test" },
      });

      const [, options] = fetchMock.mock.calls[0];
      const payload = JSON.parse(String(options?.body));
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/errors",
        expect.objectContaining({ method: "POST", keepalive: true }),
      );
      expect(payload).toMatchObject({
        correlationId: "corr-123",
        message: "render failed",
        route: "/dashboard",
        meta: { source: "test" },
      });
      expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false);
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("adds correlation and request identifiers to traced fetch responses", async () => {
    sessionStorage.clear();
    const fetchMock = jest.fn().mockResolvedValue(
      {
        ok: true,
        status: 200,
        statusText: "OK",
        headers: {
          get: (name: string) => name.toLowerCase() === "content-type" ? "application/json" : null,
          entries: () => [][Symbol.iterator](),
        },
        json: async () => ({ ok: true }),
      } as Response,
    );
    global.fetch = fetchMock;
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const client = TracedHttpClient.getInstance();
    client.setBaseURL("https://api.example.test/");
    const response = await client.get<{ ok: boolean }>("/health", { correlationId: "corr-456" });
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Record<string, string>;

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/health", expect.any(Object));
    expect(headers["X-Correlation-Id"]).toBe("corr-456");
    expect(headers["X-Request-Id"]).toBeTruthy();
    expect(headers["Content-Type"]).toBeUndefined();
    expect(response.data).toEqual({ ok: true });
    expect(response.timing?.duration).toBeGreaterThanOrEqual(0);
  });
});
