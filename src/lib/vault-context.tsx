"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type VaultContextValue = {
  keys: Record<string, CryptoKey>;
  setKey: (vaultId: string, key: CryptoKey) => void;
  clearKey: (vaultId: string) => void;
  clearAllKeys: () => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 30_000;

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [keys, setKeys] = useState<Record<string, CryptoKey>>({});
  const lastActivity = useRef(0);

  const setKey = useCallback((vaultId: string, key: CryptoKey) => {
    setKeys((prev) => ({ ...prev, [vaultId]: key }));
  }, []);

  const clearKey = useCallback((vaultId: string) => {
    setKeys((prev) => {
      const next = { ...prev };
      delete next[vaultId];
      return next;
    });
  }, []);

  const clearAllKeys = useCallback(() => setKeys({}), []);

  const hasUnlockedVaults = Object.keys(keys).length > 0;

  // Inactivity timer
  useEffect(() => {
    if (!hasUnlockedVaults) return;

    lastActivity.current = Date.now();

    function updateActivity() {
      lastActivity.current = Date.now();
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > INACTIVITY_TIMEOUT_MS) {
        clearAllKeys();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [hasUnlockedVaults, clearAllKeys]);

  // Lock on tab hide
  useEffect(() => {
    if (!hasUnlockedVaults) return;

    function onVisibilityChange() {
      if (document.hidden) clearAllKeys();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [hasUnlockedVaults, clearAllKeys]);

  return (
    <VaultContext.Provider value={{ keys, setKey, clearKey, clearAllKeys }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
