"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("Yeni şifre en az 6 karakter olmalı.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setIsPending(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      setMessage("Şifren güncellendi. Şimdi giriş yapabilirsin.");
      setPassword("");
      setConfirmPassword("");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Şifre güncellenirken bir sorun oluştu.";
      setErrorMessage(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 sm:px-6">
      <section className="section-shell w-full rounded-[2rem] p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-muted">
          Yeni şifre
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold">
          Hesabın için yeni bir şifre belirle.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
          E-postadaki bağlantı ile buraya geldiysen aşağıdan yeni şifreni
          kaydedebilirsin.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Yeni şifre</span>
            <div className="relative">
              <input
                className="w-full rounded-2xl border border-border bg-white/78 px-4 py-3 pr-12 outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10 dark:bg-white/7"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="En az 6 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:text-accent"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Yeni şifre tekrar</span>
            <input
              className="w-full rounded-2xl border border-border bg-white/78 px-4 py-3 outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10 dark:bg-white/7"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Şifreni tekrar yaz"
            />
          </label>

          {message ? (
            <p className="rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
              {message}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#b24d74_0%,#d07c8f_100%)] px-4 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:opacity-95 disabled:opacity-70"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Şifreyi güncelle
          </button>
        </form>

        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex rounded-full border border-border bg-white/70 px-4 py-2 text-sm font-semibold shadow-soft transition hover:text-accent dark:bg-white/8"
          >
            Girişe dön
          </Link>
        </div>
      </section>
    </main>
  );
}
