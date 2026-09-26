"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAddress,
  isAllowed,
  isConnected,
  requestAccess,
  signMessage,
} from "@stellar/freighter-api";
import { api, ApiError } from "@/lib/api";
import { trackAuthEvent } from "@/lib/analytics";

const TOKEN_STORAGE_KEY = "amana_jwt";

// Refresh the session this long before the backend-issued JWT actually expires.
const REFRESH_BUFFER_MS = 60 * 1000;

interface AuthState {
  address: string | null;
  shortAddress: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isWalletConnected: boolean;
  isWalletDetected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  connectWallet: () => Promise<void>;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage may be unavailable (private mode, quota); auth still works in-memory.
  }
}

function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures on cleanup.
  }
}

/**
 * Decode a JWT payload without ever throwing. Returns null for malformed
 * tokens (bad structure, invalid base64, non-JSON payload) so callers can
 * treat them as unauthenticated instead of crashing.
 */
function decodeTokenPayload(token: string): Record<string, unknown> | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const decoded = atob(padded);
    const payload = JSON.parse(decoded);
    if (!payload || typeof payload !== "object") return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Returns the token's expiry in epoch milliseconds, or null when the token is
 * malformed or carries no numeric `exp` claim. Aligns with the backend's
 * standard JWT `exp` (seconds since epoch).
 */
function getTokenExpiryMs(token: string): number | null {
  const payload = decodeTokenPayload(token);
  if (!payload) return null;
  const exp = payload.exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  return exp * 1000;
}

/**
 * A token is only usable when it is well-formed and not past its expiry.
 * Malformed or expired tokens are treated as unauthenticated (no bypass).
 */
function isTokenValid(token: string | null): token is string {
  if (!token) return false;
  const expiryMs = getTokenExpiryMs(token);
  if (expiryMs === null) return false;
  return Date.now() < expiryMs;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    address: null,
    shortAddress: null,
    token: null,
    isAuthenticated: false,
    isWalletConnected: false,
    isWalletDetected: false,
    isLoading: true,
    error: null,
  });

  const checkWalletState = useCallback(async () => {
    try {
      const [connectedResult, allowedResult] = await Promise.all([
        isConnected(),
        isAllowed(),
      ]);

      const hasWallet =
        connectedResult.error === undefined && connectedResult.isConnected;
      const hasPermission =
        allowedResult.error === undefined && allowedResult.isAllowed;

      let address: string | null = null;
      if (hasWallet && hasPermission) {
        const addressResult = await getAddress();
        if (addressResult.error === undefined) {
          address = addressResult.address;
        }
      }

      return { hasWallet, hasPermission, address };
    } catch (error) {
      console.error('Failed to read wallet state:', error);
      return { hasWallet: false, hasPermission: false, address: null };
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const { hasWallet, hasPermission, address } = await checkWalletState();
      const storedToken = getStoredToken();

      let token: string | null = null;
      let isAuthenticated = false;

      if (isTokenValid(storedToken)) {
        token = storedToken;
        isAuthenticated = true;
      } else if (storedToken) {
        // Malformed or expired token: drop it so it can't be reused.
        clearStoredToken();
      }

      setState({
        address,
        shortAddress: address ? shortenAddress(address) : null,
        token,
        isAuthenticated,
        isWalletConnected: hasWallet && hasPermission,
        isWalletDetected: hasWallet,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to refresh auth",
      }));
    }
  }, [checkWalletState]);

  const connectWallet = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      trackAuthEvent("connect_wallet", "started");
      const requestResult = await requestAccess();
      if (requestResult.error !== undefined) {
        throw new Error(requestResult.error.message || "Failed to connect wallet");
      }

      const address = requestResult.address;
      setState((prev) => ({
        ...prev,
        address,
        shortAddress: shortenAddress(address),
        isWalletConnected: true,
        isWalletDetected: true,
        isLoading: false,
      }));
      trackAuthEvent("connect_wallet", "success", { connected: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect wallet";
      trackAuthEvent("connect_wallet", "failed", { error: message });
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, []);

  const authenticate = useCallback(async () => {
    if (!state.address) {
      setState((prev) => ({
        ...prev,
        error: "Wallet not connected",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      trackAuthEvent("authenticate", "started");
      const { challenge } = await api.auth.challenge(state.address);

      const signResult = await signMessage(challenge, {
        address: state.address,
      });

      if (signResult.error !== undefined) {
        throw new Error(signResult.error.message || "Failed to sign challenge");
      }

      const signedMessage = signResult.signedMessage;
      if (!signedMessage) {
        throw new Error("No signed message returned");
      }
      const signedChallenge = typeof signedMessage === "string" 
        ? signedMessage 
        : Buffer.from(signedMessage).toString("base64url");
      const { token } = await api.auth.verify(state.address, signedChallenge);

      // Never trust a token we can't parse/validate; treat it as a failed auth.
      if (!isTokenValid(token)) {
        clearStoredToken();
        throw new Error("Received an invalid session token");
      }

      setStoredToken(token);

      setState((prev) => ({
        ...prev,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
      trackAuthEvent("authenticate", "success", { authenticated: true });
    } catch (error) {
      let errorMessage = "Authentication failed";
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      trackAuthEvent("authenticate", "failed", { error: errorMessage });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [state.address]);

  const logout = useCallback(async () => {
    if (state.token) {
      try {
        await api.auth.logout(state.token);
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    clearStoredToken();

    setState((prev) => ({
      ...prev,
      token: null,
      isAuthenticated: false,
      error: null,
    }));
    trackAuthEvent("logout", "success");
  }, [state.token]);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (!state.token) return;

    const expiryMs = getTokenExpiryMs(state.token);

    // Malformed token: clear it and mark the session unauthenticated.
    if (expiryMs === null) {
      clearStoredToken();
      setState((prev) => ({
        ...prev,
        token: null,
        isAuthenticated: false,
      }));
      return;
    }

    const expiresIn = expiryMs - Date.now();
    if (expiresIn <= 0) {
      clearStoredToken();
      setState((prev) => ({
        ...prev,
        token: null,
        isAuthenticated: false,
      }));
      return;
    }

    const timeout = setTimeout(() => {
      clearStoredToken();
      setState((prev) => ({
        ...prev,
        token: null,
        isAuthenticated: false,
        error: "Session expired. Please authenticate again.",
      }));
    }, Math.max(expiresIn - REFRESH_BUFFER_MS, 0));

    return () => clearTimeout(timeout);
  }, [state.token]);

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      connectWallet,
      authenticate,
      logout,
      refreshAuth,
    }),
    [state, connectWallet, authenticate, logout, refreshAuth]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
