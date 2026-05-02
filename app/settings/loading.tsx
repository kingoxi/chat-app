export default function SettingsLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="glass-panel h-11 w-32 rounded-full" />
        <div className="glass-panel h-11 w-28 rounded-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div className="section-shell min-h-[240px] rounded-[1.8rem]" />
          <div className="glass-panel min-h-[230px] rounded-[1.6rem]" />
        </div>
        <div className="space-y-5">
          <div className="glass-panel min-h-[290px] rounded-[1.6rem]" />
          <div className="glass-panel min-h-[220px] rounded-[1.6rem]" />
        </div>
      </div>
    </main>
  );
}
