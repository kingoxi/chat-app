"use client";

import { LoaderCircle, Search, Sticker } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GiphySearchResult } from "@/lib/giphy";

type GifPickerProps = {
  query: string;
  results: GiphySearchResult[];
  isLoading: boolean;
  error: string | null;
  isEnabled: boolean;
  onQueryChange: (value: string) => void;
  onPick: (gif: GiphySearchResult) => void;
};

export function GifPicker({
  query,
  results,
  isLoading,
  error,
  isEnabled,
  onQueryChange,
  onPick,
}: GifPickerProps) {
  return (
    <div className="mb-3 rounded-[1.3rem] border border-border bg-white/70 p-3 dark:bg-white/7">
      <div className="mb-3 flex items-center justify-between gap-3 rounded-[1.1rem] border border-border bg-white/82 px-3 py-2 dark:bg-white/8">
        <div>
          <p className="text-sm font-semibold">GIF ara</p>
          <p className="text-[11px] text-muted">Powered by GIPHY</p>
        </div>
        <a
          href="https://giphy.com/"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-border px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-accent transition hover:opacity-80"
        >
          GIPHY
        </a>
      </div>

      <div className="flex items-center gap-2 rounded-[1.1rem] border border-border bg-white/82 px-3 py-2 dark:bg-white/8">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={
            isEnabled ? "GIF ara: love, hug, good night..." : "Giphy anahtari eklenmemis"
          }
          disabled={!isEnabled}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>

      <div className="mt-3 min-h-20">
        {!isEnabled ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted">
            GIF arama icin `.env.local` dosyasina `NEXT_PUBLIC_GIPHY_API_KEY` ekle.
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            GIF aranıyor...
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-danger/20 bg-danger/6 px-4 py-5 text-center text-xs text-danger">
            {error}
          </p>
        ) : !query.trim() ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted">
            Popüler GIF&apos;ler yükleniyor. İstersen bir kelime de yazabilirsin.
          </p>
        ) : results.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted">
            Sonuç bulunamadı. Farklı bir kelime dene.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onPick(gif)}
                className={cn(
                  "group overflow-hidden rounded-[1.15rem] border border-border bg-black/5 text-left shadow-soft transition",
                  "hover:-translate-y-0.5 hover:border-accent/40",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gif.previewUrl}
                  alt={gif.title ?? "GIF"}
                  className="h-28 w-full object-cover"
                  loading="lazy"
                />
                <div className="flex items-center gap-2 px-3 py-2">
                  <Sticker className="h-3.5 w-3.5 text-accent" />
                  <span className="truncate text-[11px] font-medium text-foreground/80">
                    {gif.title ?? "GIF gönder"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
