export default function InviteLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="section-shell w-full rounded-[2rem] p-5 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="glass-panel min-h-[420px] rounded-[1.75rem]" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="glass-panel min-h-[260px] rounded-[1.75rem]" />
            <div className="glass-panel min-h-[260px] rounded-[1.75rem]" />
          </div>
        </div>
      </section>
    </main>
  );
}
