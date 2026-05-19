"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ColorScheme = "light" | "dark" | "system";

type ColorSchemeContextValue = {
  scheme: ColorScheme;
  resolved: "light" | "dark";
  setScheme: (s: ColorScheme) => void;
};

const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null);

const STORAGE_KEY = "ct-color-scheme";

function readStorage(): ColorScheme {
  if (typeof window === "undefined") return "system";
  const s = localStorage.getItem(STORAGE_KEY);
  return s === "light" || s === "dark" ? s : "system";
}

function readSystemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initialisers read from storage/media-query on first render (client only)
  const [scheme, setSchemeState] = useState<ColorScheme>(readStorage);
  const [systemDark, setSystemDark] = useState<boolean>(readSystemDark);

  // Derived — no separate state needed
  const isDark = scheme === "dark" || (scheme === "system" && systemDark);
  const resolved: "light" | "dark" = isDark ? "dark" : "light";

  // Sync .dark class to <html> whenever resolved changes (DOM mutation = external system)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Track system preference changes while user is on "system" scheme
  useEffect(() => {
    if (scheme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [scheme]);

  const setScheme = useCallback((s: ColorScheme) => {
    setSchemeState(s);
    localStorage.setItem(STORAGE_KEY, s);
  }, []);

  return (
    <ColorSchemeContext.Provider value={{ scheme, resolved, setScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  const ctx = useContext(ColorSchemeContext);
  if (!ctx) throw new Error("useColorScheme must be used within ColorSchemeProvider");
  return ctx;
}
