"use client";

import { useState } from "react";
import { Download, Smartphone, Wifi, WifiOff } from "lucide-react";
import { usePwa } from "@/hooks/use-pwa";

export function PwaSettingsCard() {
  const { canInstall, installApp, isInstalled, isOnline, serviceWorkerReady } =
    usePwa();
  const [installing, setInstalling] = useState(false);
  const [installNotice, setInstallNotice] = useState("");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.25rem] border border-border bg-white/58 px-4 py-4 dark:bg-white/6">
          <p className="text-sm text-muted">Kurulum durumu</p>
          <p className="mt-1 font-semibold">
            {isInstalled ? "Uygulama olarak kurulu" : "Tarayıcı üzerinden açık"}
          </p>
        </div>
        <div className="rounded-[1.25rem] border border-border bg-white/58 px-4 py-4 dark:bg-white/6">
          <p className="text-sm text-muted">Çevrimdışı hazırlık</p>
          <p className="mt-1 font-semibold">
            {serviceWorkerReady ? "Hazır" : "Hazırlanıyor"}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-[1.25rem] border border-border bg-white/58 px-4 py-4 dark:bg-white/6">
        {isOnline ? (
          <Wifi className="mt-1 h-5 w-5 text-success" />
        ) : (
          <WifiOff className="mt-1 h-5 w-5 text-danger" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {isOnline ? "Şu an çevrimiçisin" : "Şu an çevrimdışısın"}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Temel ekranlar ve uygulama kabuğu cache&apos;lendiği için bağlantı zayıfken de açılış daha dayanıklı olur.
          </p>
        </div>
      </div>

      {canInstall ? (
        <div className="rounded-[1.25rem] border border-border bg-white/58 px-4 py-4 dark:bg-white/6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Uygulamayı telefona yükle</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Yükledikten sonra tam ekran açılır, daha hızlı başlar ve normal uygulama hissi verir.
              </p>
              <button
                type="button"
                disabled={installing}
                onClick={async () => {
                  setInstalling(true);
                  const accepted = await installApp();
                  setInstallNotice(
                    accepted
                      ? "Kurulum isteği kabul edildi."
                      : "Kurulum penceresi kapatıldı ya da desteklenmedi.",
                  );
                  setInstalling(false);
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-70"
              >
                <Download className="h-4 w-4" />
                {installing ? "Açılıyor..." : "Uygulamayı yükle"}
              </button>
            </div>
          </div>
        </div>
      ) : isInstalled ? (
        <div className="rounded-[1.25rem] border border-border bg-white/58 px-4 py-4 dark:bg-white/6">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-1 h-5 w-5 text-accent" />
            <div>
              <p className="font-semibold">Zaten kurulu</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Heartline cihazında uygulama gibi çalışıyor.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.25rem] border border-border bg-white/58 px-4 py-4 text-sm leading-6 text-muted dark:bg-white/6">
          Android Chrome&apos;da menuden <strong>Uygulamayı yükle</strong> ya da <strong>Ana ekrana ekle</strong> seçeneğini kullanabilirsin. iPhone Safari&apos;de ise <strong>Paylaş &gt; Ana Ekrana Ekle</strong> yolunu izle.
        </div>
      )}

      {installNotice ? (
        <div className="rounded-[1.1rem] border border-border bg-white/55 px-4 py-3 text-sm dark:bg-white/6">
          {installNotice}
        </div>
      ) : null}
    </div>
  );
}
