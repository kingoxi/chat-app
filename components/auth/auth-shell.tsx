import Link from "next/link";
import { Heart, LockKeyhole, Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  footerText: string;
  footerCta: string;
  footerHref: string;
  children: React.ReactNode;
};

export function AuthShell({
  title,
  eyebrow,
  description,
  footerText,
  footerCta,
  footerHref,
  children,
}: AuthShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.06fr_0.94fr]">
        <section className="section-shell relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:min-h-[760px] lg:px-10 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.6),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(178,77,116,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(240,154,184,0.12),transparent_30%)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-soft">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.32em] text-muted">
                  Sadece ikiniz için
                </p>
                <h2 className="font-display text-2xl font-semibold tracking-[0.03em]">
                  {APP_NAME}
                </h2>
              </div>
            </div>

            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/45 px-4 py-2 text-sm text-muted dark:bg-white/6">
                <Sparkles className="h-4 w-4 text-accent" />
                {eyebrow}
              </div>
              <div className="space-y-4">
                <h1 className="max-w-lg font-display text-5xl leading-[0.95] font-semibold sm:text-6xl">
                  {title}
                </h1>
                <p className="max-w-lg text-base leading-7 text-muted sm:text-lg">
                  {description}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: LockKeyhole,
                    title: "Gerçekten size özel",
                    text: "RLS ile korunan odalar, net üyelik kontrolü ve güvenli veri akışı.",
                  },
                  {
                    icon: Heart,
                    title: "Mobilde akıcı hissettirir",
                    text: "Tek elle kullanıma uygun, hafif ve gece modu destekli bir arayüz.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={cn(
                      "glass-panel rounded-[1.5rem] px-5 py-5",
                      "bg-white/56 dark:bg-white/5",
                    )}
                  >
                    <item.icon className="mb-4 h-5 w-5 text-accent" />
                    <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
                    <p className="text-sm leading-6 text-muted">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.65rem] border border-border bg-white/48 p-5 shadow-soft dark:bg-white/5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Canlı deneyim</p>
                  <p className="font-semibold">Mesajlar, yazıyor durumu ve bildirimler hazır</p>
                </div>
                <div className="rounded-full border border-border bg-white/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted dark:bg-white/10">
                  MVP
                </div>
              </div>
              <div className="space-y-3">
                <div className="ml-auto max-w-[78%] rounded-[1.3rem] rounded-br-md bg-[var(--bubble-self)] px-4 py-3 text-sm text-white shadow-soft">
                  Akşam burada buluşalım mı? Bildirimleri de açalım ✨
                </div>
                <div className="max-w-[72%] rounded-[1.3rem] rounded-bl-md bg-white/78 px-4 py-3 text-sm text-foreground shadow-soft dark:bg-white/8 dark:text-foreground">
                  Her şey hazır. Sen yazınca mesajın anında burada görünüyor.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-shell rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto flex min-h-full max-w-md flex-col justify-between gap-8">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
                Hesap alanı
              </p>
              <div className="rounded-[1.5rem] bg-white/58 p-4 shadow-soft dark:bg-white/6">
                {children}
              </div>
            </div>

            <p className="text-center text-sm text-muted">
              {footerText}{" "}
              <Link
                href={footerHref}
                className="font-semibold text-accent transition hover:text-accent-strong"
              >
                {footerCta}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
