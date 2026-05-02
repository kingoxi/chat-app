export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-white/68 px-3 py-2 text-xs text-muted shadow-soft dark:bg-white/8">
      <span>yaziyor</span>
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.05s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
      </div>
    </div>
  );
}
