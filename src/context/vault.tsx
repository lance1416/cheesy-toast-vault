"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type VaultMode = "real" | "decoy";
type VaultKeySlot = { key: CryptoKey; mode: VaultMode };

type VaultContextValue = {
  keys: Record<string, VaultKeySlot>;
  setKey: (vaultId: string, key: CryptoKey, mode: VaultMode) => void;
  getMode: (vaultId: string) => VaultMode | null;
  clearKey: (vaultId: string) => void;
  clearAllKeys: () => void;
  lockTimeout: number;
  setLockTimeout: (minutes: number) => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

const LOCK_TIMEOUT_KEY = "ct-lock-timeout";
const CHECK_INTERVAL_MS = 30_000;
const DEFAULT_TIMEOUT = 5;

function readLockTimeout(): number {
  if (typeof window === "undefined") return DEFAULT_TIMEOUT;
  const s = localStorage.getItem(LOCK_TIMEOUT_KEY);
  const n = s !== null ? parseInt(s, 10) : NaN;
  return isNaN(n) ? DEFAULT_TIMEOUT : n;
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [keys, setKeys] = useState<Record<string, VaultKeySlot>>({});
  const [lockTimeout, setLockTimeoutState] = useState<number>(readLockTimeout);
  const lockTimeoutRef = useRef(lockTimeout);
  const lastActivity = useRef(0);

  const setKey = useCallback((vaultId: string, key: CryptoKey, mode: VaultMode) => {
    setKeys((prev) => ({ ...prev, [vaultId]: { key, mode } }));
  }, []);

  const getMode = useCallback(
    (vaultId: string): VaultMode | null => keys[vaultId]?.mode ?? null,
    [keys],
  );

  const clearKey = useCallback((vaultId: string) => {
    setKeys((prev) => {
      const next = { ...prev };
      delete next[vaultId];
      return next;
    });
  }, []);

  const clearAllKeys = useCallback(() => setKeys({}), []);

  const setLockTimeout = useCallback((minutes: number) => {
    setLockTimeoutState(minutes);
    lockTimeoutRef.current = minutes;
    localStorage.setItem(LOCK_TIMEOUT_KEY, String(minutes));
  }, []);

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
      if (lockTimeoutRef.current === 0) return; // "never" — no inactivity lock
      if (Date.now() - lastActivity.current > lockTimeoutRef.current * 60_000) {
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
    <VaultContext.Provider
      value={{ keys, setKey, getMode, clearKey, clearAllKeys, lockTimeout, setLockTimeout }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
