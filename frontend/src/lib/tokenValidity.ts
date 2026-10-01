export function decodeTokenPayload(token: string): Record<string, unknown> | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const payload: unknown = JSON.parse(atob(padded));
    return payload !== null && typeof payload === "object"
      ? payload as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token: string): number | null {
  const exp = decodeTokenPayload(token)?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : null;
}

export function isTokenValid(token: string | null): token is string {
  if (!token) return false;
  const expiryMs = getTokenExpiryMs(token);
  return expiryMs !== null && Date.now() < expiryMs;
}

export function isTokenExpired(token: string): boolean {
  return !isTokenValid(token);
}