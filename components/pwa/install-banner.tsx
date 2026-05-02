"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { usePwa } from "@/hooks/use-pwa";

const DISMISS_KEY = "heartline.pwaBannerDismissed";

export function InstallBanner() {
  const { canInstall, isInstalled, installApp } = usePwa();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(DISMISS_KEY) === "true";
  });
  const [installing, setInstalling] = useState(false);

  if (!canInstall || isInstalled || dismissed) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4 sm:hidden">
      <div className="pointer-events-auto mx-auto max-w-md rounded-[1.6rem] border border-border bg-[color:var(--surface-strong)] p-4 shadow-soft backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Telefonuna ekle</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Heartline&apos;ı uygulama gibi aç, daha hızlı kullan.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={installing}
                onClick={async () => {
                  setInstalling(true);
                  await installApp();
                  setInstalling(false);
                }}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-70"
              >
                {installing ? "Açılıyor..." : "Yükle"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDismissed(true);
                  window.localStorage.setItem(DISMISS_KEY, "true");
                }}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:text-accent"
              >
                Daha sonra
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              window.localStorage.setItem(DISMISS_KEY, "true");
            }}
            className="rounded-full p-1.5 text-muted transition hover:text-foreground"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
