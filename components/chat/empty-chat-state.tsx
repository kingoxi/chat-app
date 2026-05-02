"use client";

import { useState } from "react";
import { Check, Copy, HeartHandshake, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyChatStateProps = {
  roomCode: string;
  partnerName?: string | null;
};

export function EmptyChatState({ roomCode, partnerName }: EmptyChatStateProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-1 items-center justify-center px-4 py-10">
      <div className="glass-panel animate-float-soft w-full rounded-[2rem] p-6 text-center sm:p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.45rem] bg-accent-soft text-accent shadow-soft">
          <HeartHandshake className="h-7 w-7" />
        </div>
        <p className="mb-2 text-sm uppercase tracking-[0.24em] text-muted">
          Oda hazir
        </p>
        <h2 className="mb-3 font-display text-4xl font-semibold">
          {partnerName
            ? `${partnerName} ile ilk mesaji at`
            : "Partnerini bu koda davet et"}
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm leading-7 text-muted">
          Kod paylasildiginda oda sadece iki kisiye acik kalir. Partnerin
          baglandiginda typing, realtime mesaj ve bildirimler otomatik devreye girer.
        </p>
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-[1.4rem] border border-border bg-white/62 px-4 py-4 shadow-soft dark:bg-white/7">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            room code
          </div>
          <div className="font-display text-4xl font-semibold tracking-[0.22em]">
            {roomCode}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
              copied
                ? "bg-success/15 text-success"
                : "border border-border bg-white/80 text-foreground hover:text-accent dark:bg-white/8",
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Kopyalandi" : "Kodu kopyala"}
          </button>
        </div>
      </div>
    </div>
  );
}
