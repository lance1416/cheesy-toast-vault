"use client";

import { createContext, useContext, useState } from "react";

type VaultContextValue = {
  cryptoKey: CryptoKey | null;
  setCryptoKey: (key: CryptoKey) => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  return (
    <VaultContext.Provider value={{ cryptoKey, setCryptoKey }}>{children}</VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
