import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { cacheClearAll } from '../lib/offlineCache';

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
  signMessage,
} from "@stellar/freighter-api";
import { api, ApiError } from "@/lib/api";
import { trackAuthEvent } from "@/lib/analytics";
import { useFreighterIdentity } from "@/hooks/useFreighterIdentity";

const TOKEN_STORAGE_KEY = "amana_jwt";
const TOKEN_ADDRESS_STORAGE_KEY = "amana_jwt_address";

// Refresh the session this long before the backend-issued JWT actually expires.
const REFRESH_BUFFER_MS = 60 * 1000;

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  address: string | null;
  shortAddress: string | null;
  isWalletConnected: boolean;
  isWalletDetected: boolean;
  connectWallet: () => Promise<void>;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_ADDRESS_STORAGE_KEY);
}

function getTokenAddress(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.walletAddress ?? payload.sub ?? null;
  } catch {
    return null;
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
  const identity = useFreighterIdentity();
  const [state, setState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const refreshAuth = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const storedToken = getStoredToken();

      let token: string | null = null;
      let isAuthenticated = false;

      if (isTokenValid(storedToken)) {
        token = storedToken;
        isAuthenticated = true;
      } else if (storedToken) {
        clearStoredToken();
      }

      setState({
        token,
        isAuthenticated,
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
  }, []);

  const authenticate = useCallback(async () => {
    if (!identity.address) {
      setState((prev) => ({
        ...prev,
        error: "Wallet not connected",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      trackAuthEvent("authenticate", "started");
      const { challenge } = await api.auth.challenge(identity.address);

      const signResult = await signMessage(challenge, {
        address: identity.address,
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
      const { token } = await api.auth.verify(identity.address, signedChallenge);

      // Never trust a token we can't parse/validate; treat it as a failed auth.
      if (!isTokenValid(token)) {
        clearStoredToken();
        throw new Error("Received an invalid session token");
      }

      setStoredToken(token);
      sessionStorage.setItem(TOKEN_ADDRESS_STORAGE_KEY, identity.address);

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
  }, [identity.address]);

  const logout = useCallback(async () => {
    if (state.token) {
      try {
        await api.auth.logout(state.token);
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    // Clear all auth-related storage
    clearStoredToken();
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        await window.caches.delete("amana-api-cache-v1");
      } catch (error) {
        console.warn("Failed to clear cached API responses:", error);
      }
    }

    setState((prev) => ({
      ...prev,
      address: null,
      shortAddress: null,
      token: null,
      isAuthenticated: false,
      isWalletConnected: false,
      error: null,
    }));
    trackAuthEvent("logout", "success");
  }, [state.token]);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (identity.isLoading || !identity.address || !state.token) return;
    const tokenAddress =
      sessionStorage.getItem(TOKEN_ADDRESS_STORAGE_KEY) ??
      getTokenAddress(state.token);
    if (tokenAddress && tokenAddress.toLowerCase() !== identity.address.toLowerCase()) {
      clearStoredToken();
      setState((prev) => ({ ...prev, token: null, isAuthenticated: false }));
    }
  }, [identity.address, identity.isLoading, state.token]);

  useEffect(() => {
    if (!state.token) return;

    // Guard the parse with try/catch, reusing isTokenExpired helper
    if (isTokenExpired(state.token)) {
      clearStoredToken();
      setState((prev) => ({
        ...prev,
        token: null,
        isAuthenticated: false,
      }));
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Flush cached trades so offline data is not readable after logout.
    await cacheClearAll();
    setUser(null);
  }, []);

    try {
      const payload = JSON.parse(atob(state.token.split(".")[1]));
      const exp = payload.exp;
      if (!exp) return;

      const expiresIn = exp * 1000 - Date.now();
      if (expiresIn <= 0) {
        clearStoredToken();
        setState((prev) => ({
          ...prev,
          token: null,
          isAuthenticated: false,
        }));
        return;
      }

      const refreshBuffer = 60 * 1000;
      const timeout = setTimeout(() => {
        clearStoredToken();
        setState((prev) => ({
          ...prev,
          token: null,
          isAuthenticated: false,
          error: "Session expired. Please authenticate again.",
        }));
      }, expiresIn - refreshBuffer);

      return () => clearTimeout(timeout);
    } catch (error) {
      console.error('Failed to parse token expiration:', error);
      // If parse fails, treat token as invalid
      clearStoredToken();
      setState((prev) => ({
        ...prev,
        token: null,
        isAuthenticated: false,
        error: "Invalid token format",
      }));
    }
  }, [state.token]);

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      address: identity.address,
      shortAddress: identity.shortAddress,
      isWalletConnected: identity.isAuthorized,
      isWalletDetected: identity.isWalletDetected,
      isLoading: state.isLoading || identity.isLoading,
      error: state.error ?? identity.error,
      connectWallet: identity.connectWallet,
      authenticate,
      logout,
      refreshAuth,
    }),
    [state, identity, authenticate, logout, refreshAuth]
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
