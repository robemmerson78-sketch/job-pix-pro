import { useEffect, useState } from "react";

import type { ModelKey } from "./analysis";

export type ThemeChoice = "system" | "light" | "dark";
export type CurrencyCode = "CAD" | "USD";
export type UnitSystem = "imperial" | "metric";

export interface Preferences {
  theme: ThemeChoice;
  currency: CurrencyCode;
  units: UnitSystem;
  /** Which model runs first when analysing photos; the other is the second opinion. */
  analysisModel: ModelKey;
  /** Keep sharper analysis-only photo copies on this device. */
  keepSharpPhotos: boolean;
}

export interface QuoteDefaults {
  laborRate: number;
  taxPercent: number;
  paymentTerms: string;
  validityDays: number;
  depositPercent: number;
}

const PREFS_KEY = "cq.prefs.v1";
const DEFAULTS_KEY = "cq.quotedefaults.v1";

export const defaultPreferences: Preferences = {
  theme: "system",
  currency: "CAD",
  units: "imperial",
  analysisModel: "openai",
  keepSharpPhotos: true,
};

export const defaultQuoteDefaults: QuoteDefaults = {
  laborRate: 65,
  taxPercent: 5,
  paymentTerms: "Net 15 — payable on completion",
  validityDays: 30,
  depositPercent: 0,
};

const isBrowser = () => typeof window !== "undefined";

export function loadPreferences(): Preferences {
  if (!isBrowser()) return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaultPreferences, ...JSON.parse(raw) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(p: Preferences) {
  if (!isBrowser()) return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("cq:prefs"));
}

export function loadQuoteDefaults(): QuoteDefaults {
  if (!isBrowser()) return defaultQuoteDefaults;
  try {
    const raw = window.localStorage.getItem(DEFAULTS_KEY);
    return raw ? { ...defaultQuoteDefaults, ...JSON.parse(raw) } : defaultQuoteDefaults;
  } catch {
    return defaultQuoteDefaults;
  }
}

export function saveQuoteDefaults(d: QuoteDefaults) {
  if (!isBrowser()) return;
  window.localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d));
}

/**
 * Reads a saved preference only once the page is live on the device, so the
 * first paint never shows a different value than the saved one.
 */
export function useHydratedPreferences(): Preferences {
  const [prefs, setPrefs] = useState<Preferences>(defaultPreferences);
  useEffect(() => {
    const sync = () => setPrefs(loadPreferences());
    sync();
    window.addEventListener("cq:prefs", sync);
    return () => window.removeEventListener("cq:prefs", sync);
  }, []);
  return prefs;
}

export const useCurrency = (): CurrencyCode => useHydratedPreferences().currency;

/** Adds or removes the dark class based on the saved appearance choice. */
export function applyTheme(theme: ThemeChoice) {
  if (!isBrowser()) return;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
}
