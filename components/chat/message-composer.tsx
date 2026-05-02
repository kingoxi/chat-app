"use client";

import { Mic, SendHorizonal, SmilePlus, Square, Sticker, Trash2 } from "lucide-react";
import { GifPicker } from "@/components/chat/gif-picker";
import { QUICK_EMOJIS } from "@/lib/constants";
import { formatAudioDuration } from "@/lib/date";
import type { GiphySearchResult } from "@/lib/giphy";
import { cn } from "@/lib/utils";

type MessageComposerProps = {
  value: string;
  disabled?: boolean;
  isSending?: boolean;
  isEmojiOpen: boolean;
  isGifOpen: boolean;
  isRecording: boolean;
  recordingDurationMs: number;
  canRecordAudio: boolean;
  canUseGiphy: boolean;
  gifQuery: string;
  gifResults: GiphySearchResult[];
  gifLoading: boolean;
  gifError: string | null;
  audioDraft: {
    url: string;
    durationMs: number;
  } | null;
  audioError: string | null;
  onValueChange: (value: string) => void;
  onSend: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearAudioDraft: () => void;
  onSendAudio: () => void;
  onToggleEmoji: () => void;
  onToggleGif: () => void;
  onEmojiPick: (emoji: string) => void;
  onGifQueryChange: (value: string) => void;
  onGifPick: (gif: GiphySearchResult) => void;
};

export function MessageComposer({
  value,
  disabled,
  isSending,
  isEmojiOpen,
  isGifOpen,
  isRecording,
  recordingDurationMs,
  canRecordAudio,
  canUseGiphy,
  gifQuery,
  gifResults,
  gifLoading,
  gifError,
  audioDraft,
  audioError,
  onValueChange,
  onSend,
  onStartRecording,
  onStopRecording,
  onClearAudioDraft,
  onSendAudio,
  onToggleEmoji,
  onToggleGif,
  onEmojiPick,
  onGifQueryChange,
  onGifPick,
}: MessageComposerProps) {
  return (
    <div className="glass-panel shrink-0 rounded-[1.8rem] px-3 py-3 sm:px-4">
      {isEmojiOpen ? (
        <div className="mb-3 flex flex-wrap gap-2 rounded-[1.3rem] border border-border bg-white/60 p-3 dark:bg-white/7">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onEmojiPick(emoji)}
              className="rounded-xl bg-white/78 px-3 py-2 text-lg transition hover:-translate-y-0.5 dark:bg-white/8"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      {isGifOpen ? (
        <GifPicker
          query={gifQuery}
          results={gifResults}
          isLoading={gifLoading}
          error={gifError}
          isEnabled={canUseGiphy}
          onQueryChange={onGifQueryChange}
          onPick={onGifPick}
        />
      ) : null}

      {audioDraft ? (
        <div className="mb-3 rounded-[1.3rem] border border-border bg-white/70 p-3 dark:bg-white/7">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Sesli mesaj hazır</p>
              <p className="text-xs text-muted">
                Süre: {formatAudioDuration(audioDraft.durationMs)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearAudioDraft}
              className="rounded-full border border-border p-2 text-muted transition hover:text-danger"
              aria-label="Ses taslağını sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <audio src={audioDraft.url} controls className="mt-3 w-full" />
        </div>
      ) : null}

      {isRecording ? (
        <div className="mb-3 flex items-center justify-between rounded-[1.3rem] border border-danger/20 bg-danger/8 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Kayit aliniyor</p>
            <p className="text-xs text-muted">
              {formatAudioDuration(recordingDurationMs)}
            </p>
          </div>
          <button
            type="button"
            onClick={onStopRecording}
            className="inline-flex items-center gap-2 rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
          >
            <Square className="h-4 w-4" />
            Bitir
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <button
          type="button"
          onClick={onToggleEmoji}
          disabled={Boolean(audioDraft) || isRecording}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-white/72 text-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/8"
          aria-label="Emoji sec"
        >
          <SmilePlus className="h-4.5 w-4.5" />
        </button>

        <button
          type="button"
          onClick={onToggleGif}
          disabled={Boolean(audioDraft) || isRecording}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-white/72 text-muted transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/8"
          aria-label="GIF ara"
        >
          <Sticker className="h-4.5 w-4.5" />
        </button>

        <textarea
          value={value}
          disabled={disabled || Boolean(audioDraft) || isRecording}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="Bir sey yaz..."
          rows={1}
          className={cn(
            "max-h-36 min-h-[48px] flex-1 resize-none rounded-[1.4rem] border border-border bg-white/82 px-4 py-3 outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10 dark:bg-white/7",
            "whitespace-pre-wrap break-words",
            (audioDraft || isRecording) && "opacity-60",
          )}
        />

        <button
          type="button"
          disabled={disabled || !canRecordAudio || Boolean(audioDraft) || isRecording}
          onClick={onStartRecording}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-white/72 text-muted shadow-soft transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/8"
          aria-label="Ses kaydi baslat"
        >
          <Mic className="h-4.5 w-4.5" />
        </button>

        <button
          type="button"
          disabled={disabled || isRecording || (!audioDraft && !value.trim())}
          onClick={audioDraft ? onSendAudio : onSend}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#b24d74_0%,#d07c8f_100%)] text-white shadow-soft transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={audioDraft ? "Sesli mesaji gonder" : "Mesaj gonder"}
        >
          <SendHorizonal className={cn("h-4.5 w-4.5", isSending && "animate-pulse")} />
        </button>
      </div>

      {audioError ? (
        <p className="mt-2 px-1 text-[11px] text-danger">{audioError}</p>
      ) : null}

      <p className="mt-2 px-1 text-[11px] text-muted">
        Enter gonderir, Shift + Enter yeni satir acik tutar. Sesli mesaj en fazla 60 saniye olabilir.
      </p>
    </div>
  );
}
