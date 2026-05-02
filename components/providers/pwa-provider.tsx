"use client";

import { useEffect, useMemo, useState } from "react";
import { PwaContext } from "@/hooks/use-pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function detectStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return (
    iosStandalone ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function PwaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => detectStandaloneMode());
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.navigator.onLine;
  });
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const handleOnlineStatus = () => {
      setIsOnline(window.navigator.onLine);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const handleStandaloneChange = () => {
      setIsInstalled(detectStandaloneMode());
    };

    standaloneMedia.addEventListener("change", handleStandaloneChange);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready
        .then(() => {
          setServiceWorkerReady(true);
        })
        .catch(() => {
          setServiceWorkerReady(false);
        });
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
      standaloneMedia.removeEventListener("change", handleStandaloneChange);
    };
  }, []);

  const value = useMemo(
    () => ({
      canInstall: Boolean(deferredPrompt) && !isInstalled,
      isInstalled,
      isOnline,
      serviceWorkerReady,
      installApp: async () => {
        if (!deferredPrompt) {
          return false;
        }

        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        const accepted = choice.outcome === "accepted";

        if (accepted) {
          setIsInstalled(true);
        }

        setDeferredPrompt(null);
        return accepted;
      },
    }),
    [deferredPrompt, isInstalled, isOnline, serviceWorkerReady],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}
