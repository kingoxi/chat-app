import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 sm:px-6">
      <section className="section-shell w-full rounded-[2rem] p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">
          Şifre yardımı
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold">
          Şifreni sıfırlamak çok kısa sürer.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
          Giriş ekranındaki <strong>Şifremi unuttum</strong> bağlantısına bas,
          e-posta adresini yaz ve sana gelen bağlantıyla yeni şifreni belirle.
        </p>
        <div className="mt-6 rounded-[1.5rem] border border-border bg-white/58 p-5 text-sm leading-7 text-muted shadow-soft dark:bg-white/6">
          Eğer e-posta gelmezse spam klasörünü kontrol et. Supabase tarafında
          Email provider açık değilse sıfırlama bağlantısı da gönderilmez.
        </div>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex rounded-full border border-border bg-white/70 px-4 py-2 text-sm font-semibold shadow-soft transition hover:text-accent dark:bg-white/8"
          >
            Giriş ekranına dön
          </Link>
        </div>
      </section>
    </main>
  );
}
