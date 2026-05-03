"use client";

import { startTransition, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
  TestTubeDiagonal,
} from "lucide-react";
import { readPublicEnv } from "@/lib/public-env";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthFormProps = {
  mode: "login" | "register";
};

type FormState = {
  email: string;
  password: string;
  displayName: string;
};

type DiagnosticItem = {
  label: string;
  status: "idle" | "ok" | "error";
  detail: string;
};

const initialFormState: FormState = {
  email: "",
  password: "",
  displayName: "",
};

function maskValue(value: string | undefined) {
  if (!value) {
    return "eksik";
  }

  if (value.length <= 8) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function mapAuthErrorMessage(message: string, mode: "login" | "register") {
  const normalized = message.toLowerCase();

  if (normalized.includes("missing supabase environment variables")) {
    return "Sunucuda Supabase ortam değişkenleri build aninda yuklenmemis. Hosting panelinde env'leri kaydedip npm run build komutunu tekrar calistir.";
  }

  if (normalized.includes("invalid api key") || normalized.includes("invalid apikey")) {
    return "Supabase anahtari gecersiz gorunuyor. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY degerini tekrar kontrol et.";
  }

  if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
    return "Supabase'a baglanilamadi. URL, key ve sunucunun dis istek erisimi kontrol edilmeli.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı. Hesabı yeni oluşturduysan önce e-postanı doğrulaman gerekebilir.";
  }

  if (normalized.includes("email not confirmed")) {
    return "E-posta adresin henüz doğrulanmamış. Gelen kutundaki doğrulama bağlantısını açıp tekrar dene.";
  }

  if (normalized.includes("user already registered")) {
    return "Bu e-posta ile zaten bir hesap var. Giriş yapabilir ya da şifreni sıfırlayabilirsin.";
  }

  if (normalized.includes("password should be at least")) {
    return "Şifre çok kısa. Lütfen en az 6 karakter kullan.";
  }

  if (normalized.includes("signup is disabled")) {
    return "Kayıt şu anda kapalı görünüyor. Supabase üzerinde Email provider ayarlarını kontrol et.";
  }

  if (mode === "login") {
    return "Giriş yapılamadı. E-posta, şifre ve e-posta doğrulamasını kontrol edip tekrar dene.";
  }

  return "İşlem tamamlanamadı. Girdiğin bilgileri kontrol edip tekrar dene.";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const runtimeEnv = useMemo(() => readPublicEnv(), []);
  const publicSupabaseUrl = runtimeEnv.NEXT_PUBLIC_SUPABASE_URL;
  const publicSupabaseKey = runtimeEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const publicGiphyKey = runtimeEnv.NEXT_PUBLIC_GIPHY_API_KEY;
  const [formState, setFormState] = useState(initialFormState);
  const [isPending, setIsPending] = useState(false);
  const [isResetPending, setIsResetPending] = useState(false);
  const [isDiagnosticsPending, setIsDiagnosticsPending] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);

  const isRegister = mode === "register";

  const submitLabel = isRegister ? "Hesabı oluştur" : "Giriş yap";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    setIsPending(true);

    try {
      if (!supabase) {
        throw new Error("Supabase ortam değişkenleri eksik.");
      }

      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: formState.email.trim(),
          password: formState.password,
          options: {
            data: {
              display_name: formState.displayName.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setSuccessMessage(
            "Kayıt tamamlandı. E-posta doğrulaması açıksa gelen kutunu kontrol et, ardından giriş yap.",
          );
          setFormState(initialFormState);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formState.email.trim(),
          password: formState.password,
        });

        if (error) {
          throw error;
        }
      }

      startTransition(() => {
        router.replace(isRegister ? "/invite?welcome=registered" : "/invite?welcome=loggedin");
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Beklenmeyen bir hata oldu.";
      setErrorMessage(mapAuthErrorMessage(message, mode));
    } finally {
      setIsPending(false);
    }
  }

  async function handleForgotPassword() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const email = formState.email.trim();

    if (!email) {
      setErrorMessage("Şifre sıfırlama bağlantısı göndermek için önce e-posta adresini yaz.");
      return;
    }

    setIsResetPending(true);

    try {
      if (!supabase) {
        throw new Error("Supabase ortam değişkenleri eksik.");
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Şifre sıfırlama bağlantısı gönderildi. E-postanı kontrol edip yeni şifreni belirleyebilirsin.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Şifre sıfırlama bağlantısı gönderilemedi.";
      setErrorMessage(mapAuthErrorMessage(message, "login"));
    } finally {
      setIsResetPending(false);
    }
  }

  async function runDiagnostics() {
    const initialChecks: DiagnosticItem[] = [
      {
        label: "Supabase URL",
        status: publicSupabaseUrl ? "ok" : "error",
        detail: publicSupabaseUrl ?? "NEXT_PUBLIC_SUPABASE_URL eksik",
      },
      {
        label: "Supabase Publishable Key",
        status: publicSupabaseKey ? "ok" : "error",
        detail: maskValue(publicSupabaseKey),
      },
      {
        label: "GIPHY Key",
        status: publicGiphyKey ? "ok" : "error",
        detail: maskValue(publicGiphyKey),
      },
    ];

    setDiagnostics(initialChecks);
    setIsDiagnosticsPending(true);

    try {
      if (!supabase) {
        setDiagnostics((current) => [
          ...current,
          {
            label: "Supabase Client",
            status: "error",
            detail: "Client olusturulamadi. Env degerleri build aninda yuklenmemis.",
          },
        ]);
        return;
      }

      const nextChecks: DiagnosticItem[] = [];

      try {
        const { error } = await supabase.rpc("get_my_room_id");
        nextChecks.push({
          label: "Supabase DB RPC",
          status: error ? "error" : "ok",
          detail: error ? error.message : "DB baglantisi ve RPC erisimi calisiyor.",
        });
      } catch (error) {
        nextChecks.push({
          label: "Supabase DB RPC",
          status: "error",
          detail:
            error instanceof Error ? error.message : "Supabase RPC testi basarisiz oldu.",
        });
      }

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        nextChecks.push({
          label: "Supabase Auth",
          status: error ? "error" : "ok",
          detail: error
            ? error.message
            : session?.user?.email
              ? `Aktif oturum var: ${session.user.email}`
              : "Auth istemcisi cevap veriyor, aktif oturum yok.",
        });
      } catch (error) {
        nextChecks.push({
          label: "Supabase Auth",
          status: "error",
          detail:
            error instanceof Error ? error.message : "Supabase Auth testi basarisiz oldu.",
        });
      }

      if (publicGiphyKey) {
        try {
          const url = new URL("https://api.giphy.com/v1/gifs/trending");
          url.searchParams.set("api_key", publicGiphyKey);
          url.searchParams.set("limit", "1");

          const response = await fetch(url.toString());
          nextChecks.push({
            label: "GIPHY API",
            status: response.ok ? "ok" : "error",
            detail: response.ok
              ? "GIPHY cevabi alindi."
              : `HTTP ${response.status} ${response.statusText}`,
          });
        } catch (error) {
          nextChecks.push({
            label: "GIPHY API",
            status: "error",
            detail:
              error instanceof Error ? error.message : "GIPHY testi basarisiz oldu.",
          });
        }
      }

      setDiagnostics((current) => [...current, ...nextChecks]);
    } finally {
      setIsDiagnosticsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {!supabase ? (
        <p className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
          Supabase ortam değişkenleri tanımlı değil. Hosting panelinde
          `NEXT_PUBLIC_SUPABASE_URL` ve
          `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` eklenmeli.
        </p>
      ) : null}

      <div className="space-y-2">
        <h2 className="font-display text-3xl font-semibold">
          {isRegister ? "Özel alanınızı oluşturalım" : "Tekrar hoş geldin"}
        </h2>
        <p className="text-sm leading-6 text-muted">
          {isRegister
            ? "Hesabını açtıktan sonra yalnızca iki kişilik odanı kurup partner kodunu paylaşabilirsin."
            : "Supabase Auth ile güvenli giriş yap; seni doğrudan özel sohbetine yönlendirelim."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {isRegister ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium">Görünen ad</span>
            <input
              className="w-full rounded-2xl border border-border bg-white/78 px-4 py-3 outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10 dark:bg-white/7"
              placeholder="Örnek: Ayşe"
              required
              value={formState.displayName}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium">E-posta</span>
          <input
            className="w-full rounded-2xl border border-border bg-white/78 px-4 py-3 outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10 dark:bg-white/7"
            type="email"
            placeholder="you@example.com"
            required
            value={formState.email}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Şifre</span>
          <div className="relative">
            <input
              className="w-full rounded-2xl border border-border bg-white/78 px-4 py-3 pr-12 outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10 dark:bg-white/7"
              type={isPasswordVisible ? "text" : "password"}
              placeholder="En az 6 karakter"
              minLength={6}
              required
              value={formState.password}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((current) => !current)}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:text-accent"
              aria-label={isPasswordVisible ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {isPasswordVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </label>

        {!isRegister ? (
          <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={isResetPending || !supabase}
              className="inline-flex items-center gap-2 font-medium text-accent transition hover:text-accent-strong disabled:opacity-70"
            >
              {isResetPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <MailCheck className="h-4 w-4" />
              )}
              Şifremi unuttum
            </button>
            <Link
              href="/forgot-password"
              className="text-muted transition hover:text-accent"
            >
              Yardım sayfası
            </Link>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
            {successMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending || !supabase}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition",
            "bg-[linear-gradient(135deg,#b24d74_0%,#d07c8f_100%)] shadow-soft hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70",
          )}
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {submitLabel}
        </button>
      </form>

      {!isRegister ? (
        <div className="rounded-[1.4rem] border border-border bg-white/56 px-4 py-4 text-sm leading-6 text-muted dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">Bağlantı testi</p>
              <p className="text-xs text-muted">
                Supabase env, auth, DB RPC ve GIPHY erişimini kontrol eder.
              </p>
            </div>
            <button
              type="button"
              onClick={runDiagnostics}
              disabled={isDiagnosticsPending}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white/72 px-4 py-2 font-semibold text-foreground shadow-soft transition hover:text-accent disabled:opacity-60 dark:bg-white/8"
            >
              {isDiagnosticsPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <TestTubeDiagonal className="h-4 w-4" />
              )}
              DB test
            </button>
          </div>

          {diagnostics.length > 0 ? (
            <div className="mt-4 space-y-2">
              {diagnostics.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-xs",
                    item.status === "ok"
                      ? "border-success/25 bg-success/10 text-success"
                      : item.status === "error"
                        ? "border-danger/25 bg-danger/10 text-danger"
                        : "border-border bg-white/70 text-muted dark:bg-white/6",
                  )}
                >
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-1 break-all">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-[1.4rem] border border-border bg-white/56 px-4 py-4 text-sm leading-6 text-muted dark:bg-white/5">
        Girişten sonra seni partner kodu ekranına ya da doğrudan sohbet odana götürüyoruz.
        <Link
          href={isRegister ? "/login" : "/register"}
          className="ml-1 font-semibold text-accent hover:text-accent-strong"
        >
          {isRegister ? "Zaten hesabım var" : "İlk kez buradayım"}
        </Link>
      </div>
    </div>
  );
}
