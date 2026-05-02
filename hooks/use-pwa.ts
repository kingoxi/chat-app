"use client";

import { createContext, useContext } from "react";

export type PwaContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  serviceWorkerReady: boolean;
  installApp: () => Promise<boolean>;
};

export const PwaContext = createContext<PwaContextValue | null>(null);

export function usePwa() {
  const context = useContext(PwaContext);

  if (!context) {
    throw new Error("usePwa must be used inside PwaProvider.");
  }

  return context;
}
