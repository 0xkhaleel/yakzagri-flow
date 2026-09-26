"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  intlLocale,
  resolveLocale,
  setActiveLocale,
  SUPPORTED_LOCALES,
  type Locale,
} from "./config";

const STORAGE_KEY = "amana-locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveLocale);

  function selectLocale(nextLocale: Locale) {
    setActiveLocale(nextLocale);
    setLocaleState(nextLocale);
  }

  useEffect(() => {
    let restoreTimer: number | undefined;
    try {
      const storedLocale = window.localStorage.getItem(STORAGE_KEY);
      if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale as Locale)) {
        restoreTimer = window.setTimeout(() => {
          setActiveLocale(storedLocale as Locale);
          setLocaleState(storedLocale as Locale);
        }, 0);
      }
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }

    return () => {
      if (restoreTimer !== undefined) window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    setActiveLocale(locale);
    document.documentElement.lang = intlLocale(locale);
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Keep the selection active for this session when storage is unavailable.
    }
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: selectLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}