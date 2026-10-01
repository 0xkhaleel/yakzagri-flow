import { getApiBaseUrl, getApiVersionPrefix } from "./env";
import { trackApiFailure } from "@/lib/analytics";
import { parseBackendError, BackendErrorResponse } from "../errorHandler";
import { isTokenValid } from "../tokenValidity";
import { z } from "zod";

export type FetchOptions = RequestInit & {
  token?: string | null;
  skipAuth?: boolean;
};

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export class ApiError extends Error {
  status: number;
  data: unknown;
  backendError?: BackendErrorResponse | null;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.backendError = parseBackendError(this);
  }
}

const TOKEN_STORAGE_KEY = "amana_jwt";

/**
 * Backend idempotency lock TTL (seconds). The client dedup window must agree
 * with this value so a double-submit cannot slip past client dedup while the
 * backend key is still locked. Kept in sync with the server's lock TTL.
 */
export const IDEMPOTENCY_LOCK_TTL_SECONDS = 30;

/**
 * Backend idempotency lock TTL in milliseconds. Consumers (e.g. actionDedup)
 * should derive their window from this so client dedup and the backend lock
 * always agree.
 */
export const IDEMPOTENCY_LOCK_TTL_MS = IDEMPOTENCY_LOCK_TTL_SECONDS * 1000;

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return null;
  if (!isTokenValid(token)) {
    // Expired or malformed token: drop it so it can't be reused.
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
  return token;
}

export const navigationHelpers = {
  reload(): void {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  },
};

function createHeaders(
  headers?: HeadersInit,
  token?: string | null,
  hasBody?: boolean,
): Record<string, string> {
  const resolvedHeaders: Record<string, string> = {};

  // Only advertise a JSON content type when a request body is actually sent.
  // Setting it on bodyless requests (GET/HEAD/DELETE) forces CORS preflights
  // for cross-origin calls and needlessly widens the preflight surface.
  if (hasBody) {
    resolvedHeaders["Content-Type"] = "application/json";
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      resolvedHeaders[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      resolvedHeaders[key] = value;
    }
  } else if (headers) {
    Object.assign(resolvedHeaders, headers);
  }

  if (token) {
    resolvedHeaders.Authorization = `Bearer ${token}`;
  }

  // Idempotency: if caller passes Idempotency-Key header via headers param, preserve it
  // Otherwise, caller should use withIdempotency wrapper. We do not auto-generate here to avoid
  // leaking keys for idempotent GETs.
  return resolvedHeaders;
}

/**
 * Helper to build headers with idempotency + correlation IDs (unified toast contract).
 * Use for mutations that require exactly-once semantics and toast correlation.
 *
 * When no explicit idempotencyKey is provided, a stable key is derived from the
 * method + endpoint + body so repeated submissions of the same mutation within
 * the backend lock TTL reuse the same key (and are deduped server-side).
 */
export function withIdempotency(
  headers?: HeadersInit,
  opts?: {
    idempotencyKey?: string;
    correlationId?: string;
    method?: string;
    endpoint?: string;
    body?: unknown;
  },
): Record<string, string> {
  const out: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((v, k) => { out[k] = v; });
  } else if (Array.isArray(headers)) {
    for (const [k, v] of headers) out[k] = v;
  } else if (headers) Object.assign(out, headers as Record<string, string>);

  const idempotencyKey =
    opts?.idempotencyKey ??
    (opts?.method && opts?.endpoint
      ? deriveIdempotencyKey(opts.method, opts.endpoint, opts.body)
      : undefined);

  if (idempotencyKey) out["Idempotency-Key"] = idempotencyKey;
  if (opts?.correlationId) {
    out["X-Correlation-Id"] = opts.correlationId;
    out["X-Request-Id"] = opts.correlationId;
  }
  return out;
}

/**
 * Derive a stable idempotency key from a mutation's method, endpoint and body.
 * Stable across retries/double-submits of the same logical action so the
 * backend lock (IDEMPOTENCY_LOCK_TTL_MS) can dedupe them.
 */
export function deriveIdempotencyKey(
  method: string,
  endpoint: string,
  body?: unknown,
): string {
  let bodyPart = "";
  if (body !== undefined) {
    try {
      bodyPart = typeof body === "string" ? body : JSON.stringify(body);
    } catch {
      bodyPart = String(body);
    }
  }
  const raw = `${method.toUpperCase()}:${endpoint}:${bodyPart}`;
  // FNV-1a hash keeps the key short and deterministic without extra deps.
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `idem-${(hash >>> 0).toString(16)}`;
}

export function createQueryString(
  params?: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === "") {
      continue;
    }
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

/**
 * Consumer-facing endpoints are versioned under `/api/v1` on the backend. The
 * version prefix is injected here (centrally) so individual API modules don't
 * each hardcode a version — switching versions is a single env toggle.
 *
 * Admin (/admin, /api/admin) and infrastructure (/health*) endpoints are
 * intentionally excluded: they are unversioned internal/ops routes and must
 * keep hitting the legacy paths regardless of the version prefix config.
 */
export function resolveApiUrl(endpoint: string): string {
  const isUnversioned =
    endpoint.startsWith("/admin") ||
    endpoint.startsWith("/api/admin") ||
    endpoint.startsWith("/health");

  return isUnversioned
    ? `${getApiBaseUrl()}${endpoint}`
    : `${getApiBaseUrl()}${getApiVersionPrefix()}${endpoint}`;
}

export type RequestOptions<T> = FetchOptions & {
  /**
   * Optional zod schema used to validate the live response payload. When
   * provided, schema drift (backend returning an unexpected shape) is caught
   * and surfaced as an ApiError instead of silently flowing into the UI.
   */
  schema?: z.ZodSchema<T>;
};

export async function request<T>(
  endpoint: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const { token, skipAuth, headers, schema, ...fetchOptions } = options;

  const authToken = token ?? (!skipAuth ? getStoredToken() : null);

  const hasBody = fetchOptions.body != null;

  try {
    const response = await fetch(resolveApiUrl(endpoint), {
      ...fetchOptions,
      headers: createHeaders(headers, authToken, hasBody),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      trackApiFailure(endpoint, response.status, {
        method: fetchOptions.method ?? "GET",
      });
      throw new ApiError(
        response.status,
        (data as { error?: string })?.error || response.statusText,
        data,
      );
    }

    if (schema) {
      const validationResult = schema.safeParse(data);
      if (!validationResult.success) {
        trackApiFailure(endpoint, response.status, {
          method: fetchOptions.method ?? "GET",
          error: "Response validation failed",
        });
        throw new ApiError(
          500,
          "Response validation failed",
          validationResult.error,
        );
      }
      return validationResult.data;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    trackApiFailure(endpoint, 0, {
      method: fetchOptions.method ?? "GET",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new ApiError(
      0,
      error instanceof Error ? error.message : "Network error",
    );
  }
}

export async function requestWithResult<T>(
  endpoint: string,
  schema?: z.ZodSchema<T>,
  options: FetchOptions = {},
): Promise<ApiResult<T>> {
  try {
    const data = await request<T>(endpoint, { ...options, schema });

    return { success: true, data };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        const storedToken = getStoredToken();
        if (storedToken) {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          navigationHelpers.reload();
        }
      }
      return { success: false, error };
    }
    return {
      success: false,
      error: new ApiError(
        0,
        error instanceof Error ? error.message : "Unknown error",
      ),
    };
  }
}
