"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  /** The resolved theme actually applied (never "system"). */
  resolvedTheme: "light" | "dark";
  /** The user's stored preference (may be "system"). */
  themePreference: Theme;
  /** Set the theme preference. "system" follows OS preference. */
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "amana-theme-preference";

// Legacy storage key from the removed uiStore theme mechanism. Cleaned up on
// mount so the single surviving mechanism (this hook) is the only source of
// truth for theme persistence.
const LEGACY_STORAGE_KEY = "amana-ui-storage";

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(pref: Theme): "light" | "dark" {
  return pref === "system" ? getSystemPreference() : pref;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreference] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Read persisted preference and apply it (no flash — applied before paint via
  // the inline script in <head> below).
  useEffect(() => {
    // Drop the dead uiStore storage key so only `amana-theme-preference`
    // remains as the persisted theme source.
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const pref = stored ?? "system";
    setThemePreference(pref);
    setResolvedTheme(resolveTheme(pref));
    setMounted(true);
  }, []);

  // Apply the `dark` class to <html> whenever resolvedTheme changes.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for OS-level preference changes when the user is on "system".
  useEffect(() => {
    if (themePreference !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [themePreference]);

  const setTheme = useCallback((theme: Theme) => {
    setThemePreference(theme);
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    localStorage.setItem(STORAGE_KEY, theme);

    // Briefly add transition class so the switch animates smoothly.
    document.documentElement.classList.add("theme-transition");
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 250);
  }, []);

  return (
    <ThemeContext.Provider value={{ resolvedTheme, themePreference, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for SSR or components rendered outside the provider — return
    // dark to match the default. This avoids a runtime error while the
    // provider hydrates.
    return {
      resolvedTheme: "dark",
      themePreference: "system",
      setTheme: () => {},
    };
  }
  return ctx;
}
