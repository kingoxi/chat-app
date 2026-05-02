"use client";

import Link from "next/link";
import { CloudOff, RefreshCcw } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 sm:px-6">
      <section className="section-shell w-full rounded-[2rem] p-8 text-center sm:p-10">
        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-[1.8rem] bg-accent-soft text-accent shadow-soft">
          <CloudOff className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold">
          Bağlantı şu an yok
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted sm:text-base">
          Uygulama kabuğu cihazında duruyor ama bu ekran için internet gerekiyor.
          Bağlantın gelince tekrar deneyebilirsin.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            <RefreshCcw className="h-4 w-4" />
            Yeniden dene
          </button>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:text-accent"
          >
            Giriş ekranına git
          </Link>
        </div>
      </section>
    </main>
  );
}
