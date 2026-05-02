"use client";

import { useEffect } from "react";

export function ServiceWorkerBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Future-ready only; app should work without SW registration.
    });
  }, []);

  return null;
}
