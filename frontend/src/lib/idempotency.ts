/**
 * Idempotency keys for offline queue & dedup.
 * Backend expects `Idempotency-Key` header (ADR-004). Keys are UUIDv4 stored per action
 * so replay after offline reconnect reuses same key, preventing duplicate trades on retry.
 */

export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for jest / older env
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const IDEMPOTENCY_STORAGE_PREFIX = "amana:idempotency:";
const memoryFallback = new Map<string, string>();

export type IdempotencyScopeInput =
  | string
  | [string | null | undefined, string]
  | { userId?: string | null; scope: string };

export function resolveScope(
  scopeOrUser: string | null | undefined | [string | null | undefined, string] | { userId?: string | null; scope: string },
  maybeScope?: string,
): string {
  if (Array.isArray(scopeOrUser)) {
    const [user, s] = scopeOrUser;
    return user ? `${user}:${s}` : s;
  }
  if (typeof scopeOrUser === "object" && scopeOrUser !== null) {
    const { userId, scope } = scopeOrUser;
    return userId ? `${userId}:${scope}` : scope;
  }
  if (maybeScope !== undefined) {
    return scopeOrUser ? `${scopeOrUser}:${maybeScope}` : maybeScope;
  }
  return typeof scopeOrUser === "string" ? scopeOrUser : "default";
}

export function getOrCreateIdempotencyKey(
  scopeOrUser: string | null | undefined | [string | null | undefined, string] | { userId?: string | null; scope: string },
  maybeScope?: string,
): string {
  const scope = resolveScope(scopeOrUser, maybeScope);
  const storageKey = `${IDEMPOTENCY_STORAGE_PREFIX}${scope}`;

  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    try {
      const existing = sessionStorage.getItem(storageKey);
      if (existing) return existing;
      const fresh = generateIdempotencyKey();
      sessionStorage.setItem(storageKey, fresh);
      return fresh;
    } catch {}
  }

  const mem = memoryFallback.get(storageKey);
  if (mem) return mem;
  const fresh = generateIdempotencyKey();
  memoryFallback.set(storageKey, fresh);
  return fresh;
}

export function clearIdempotencyKey(
  scopeOrUser: string | null | undefined | [string | null | undefined, string] | { userId?: string | null; scope: string },
  maybeScope?: string,
): void {
  const scope = resolveScope(scopeOrUser, maybeScope);
  const storageKey = `${IDEMPOTENCY_STORAGE_PREFIX}${scope}`;

  memoryFallback.delete(storageKey);

  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
  }
}

export function _clearAllIdempotencyKeysForTests(): void {
  memoryFallback.clear();
  if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.clear();
    } catch {}
  }
}
