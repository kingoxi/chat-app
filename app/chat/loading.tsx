export default function ChatLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-4 sm:px-5 sm:py-6">
      <div className="glass-panel h-18 rounded-[1.8rem]" />
      <div className="mt-4 flex flex-1 flex-col rounded-[2rem] border border-border bg-white/32 p-4 shadow-soft backdrop-blur-sm dark:bg-white/3">
        <div className="space-y-4">
          <div className="mx-auto h-6 w-24 rounded-full bg-white/70 dark:bg-white/8" />
          <div className="ml-auto h-20 w-[70%] rounded-[1.6rem] bg-[var(--accent-soft)]" />
          <div className="h-18 w-[58%] rounded-[1.6rem] bg-white/70 dark:bg-white/8" />
          <div className="ml-auto h-16 w-[52%] rounded-[1.6rem] bg-[var(--accent-soft)]" />
        </div>
        <div className="mt-auto pt-6">
          <div className="glass-panel h-24 rounded-[1.8rem]" />
        </div>
      </div>
    </main>
  );
}
