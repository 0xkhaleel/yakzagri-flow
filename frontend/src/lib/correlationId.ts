/**
 * Correlation ID utilities for error reporting and backend trace lookup.
 *
 * A correlation ID is generated client-side when a render exception is caught
 * by an error boundary. It is:
 *   1. Attached to the error report payload sent to the reporting pipeline.
 *   2. Surfaced in the boundary fallback UI so users can quote it to support.
 *   3. Matched against backend `requestId` / `correlationId` fields in
 *      structured error responses (see errorHandler.ts → BackendErrorResponse).
 *
 * Format: `amana-<timestamp-base36>-<random-hex-8>`
 * Example: `amana-lzr9k2g4-a3f1c8b2`
 *
 * This module is the single source of truth for correlation-ID generation.
 * All call sites (actionDedup, offlineQueueStore, Step3Review, traced-fetch,
 * error boundaries) must route through `generateCorrelationId` so the backend
 * correlation tracing only has to match one format.
 */

/**
 * Canonical correlation-ID format produced by `generateCorrelationId`.
 * `amana-<timestamp-base36>-<random-hex-8>`
 */
export const CORRELATION_ID_PATTERN = /^amana-[0-9a-z]+-[0-9a-f]{8}$/;

/**
 * Generate a new client-side correlation ID.
 *
 * This is the canonical generator; every other correlation-ID call site in
 * the app should delegate here instead of hand-rolling its own format.
 */
export function generateCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  return `amana-${ts}-${rand}`;
}

/**
 * Type guard: does `value` match the canonical correlation-ID format?
 */
export function isCorrelationId(value: unknown): value is string {
  return typeof value === "string" && CORRELATION_ID_PATTERN.test(value);
}

/**
 * Extract the correlation / request ID from a backend structured error
 * response if one is present on the thrown value.
 */
export function extractBackendCorrelationId(
  error: unknown,
): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as Record<string, unknown>;

  // ApiError exposes .backendError from errorHandler.ts
  const backendError =
    (e.backendError as Record<string, unknown> | null | undefined) ?? null;
  if (backendError) {
    return (
      (backendError.correlationId as string | undefined) ??
      (backendError.requestId as string | undefined)
    );
  }

  // Plain structured response on .data
  const data = (e.data as Record<string, unknown> | null | undefined) ?? null;
  if (data) {
    return (
      (data.correlationId as string | undefined) ??
      (data.requestId as string | undefined)
    );
  }

  return undefined;
}

/**
 * Resolve the best correlation ID to display:
 * prefer a backend-originated ID; fall back to the client-generated one.
 */
export function resolveCorrelationId(
  error: unknown,
  clientId: string,
): string {
  return extractBackendCorrelationId(error) ?? clientId;
}
