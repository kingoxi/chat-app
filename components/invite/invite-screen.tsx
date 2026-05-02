"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Cog,
  Link2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/components/profile/avatar";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { compactRoomCode, cn } from "@/lib/utils";
import type { ProfileSummary, SavedRoomSummary } from "@/types/chat";

type InviteScreenProps = {
  profile: ProfileSummary;
  savedRooms: SavedRoomSummary[];
  initialNotice?: string | null;
  initialJoinCode?: string | null;
};

function formatSavedRoomState(room: SavedRoomSummary) {
  if (room.activeMemberCount === 0) {
    return "Oda şu an boş, geri dönmek için hazır.";
  }

  if (room.activePartnerName) {
    return `${room.activePartnerName} şu an odada olabilir.`;
  }

  return "Odada bir kişi var, yeniden bağlanabilirsin.";
}

export function InviteScreen({
  profile,
  savedRooms,
  initialNotice,
  initialJoinCode,
}: InviteScreenProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [joinCode, setJoinCode] = useState(() => compactRoomCode(initialJoinCode ?? ""));
  const [customRoomCode, setCustomRoomCode] = useState("");
  const [message, setMessage] = useState<string | null>(
    initialNotice ??
      (initialJoinCode
        ? "Paylaşılan oda kodu dolduruldu. Dilersen hemen bağlanabilirsin."
        : null),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [busySavedRoomCode, setBusySavedRoomCode] = useState<string | null>(null);
  const hasPrefilledCode = Boolean(initialJoinCode) && joinCode.length > 0;

  useEffect(() => {
    if (!initialNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [initialNotice]);

  async function createRoom() {
    setMessage(null);
    setErrorMessage(null);
    setIsCreating(true);

    try {
      const normalizedCustomCode = compactRoomCode(customRoomCode);
      if (normalizedCustomCode && normalizedCustomCode.length < 4) {
        throw new Error("Özel oda kodu en az 4 karakter olmalı.");
      }

      if (normalizedCustomCode) {
        const availabilityResult = await supabase.rpc("is_room_code_available", {
          input_room_code: normalizedCustomCode,
        });

        if (availabilityResult.error) {
          throw availabilityResult.error;
        }

        if (!availabilityResult.data) {
          throw new Error("Bu özel oda kodu zaten kullanılıyor. Başka bir kod dene.");
        }
      }

      const { data, error } = await supabase.rpc("create_private_room", {
        input_room_code: normalizedCustomCode || null,
      });

      if (error) {
        throw error;
      }

      setMessage("Odan hazır. Seni sohbet ekranına geçiriyoruz.");
      startTransition(() => {
        router.replace(`/chat?welcome=room-created&roomId=${data ?? ""}`);
        router.refresh();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Oda oluşturulamadı.";
      const normalized = message.toLowerCase();

      if (normalized.includes("already") || normalized.includes("zaten")) {
        setMessage("Zaten bir odaya bağlısın. Seni mevcut sohbetine yönlendiriyoruz.");
        startTransition(() => {
          router.replace("/chat?welcome=existing-room");
          router.refresh();
        });
      } else if (
        normalized.includes("already exists") ||
        normalized.includes("room code is already in use") ||
        normalized.includes("already in use")
      ) {
        setErrorMessage("Bu özel oda kodu zaten kullanılıyor. Başka bir kod dene.");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function joinSpecificRoom(roomCode: string) {
    setMessage(null);
    setErrorMessage(null);
    setBusySavedRoomCode(roomCode);

    try {
      const { error } = await supabase.rpc("join_room_by_code", {
        input_room_code: roomCode,
      });

      if (error) {
        throw error;
      }

      setMessage("Odaya geri dönüyorsun. Seni sohbet ekranına geçiriyoruz.");
      startTransition(() => {
        router.replace("/chat?welcome=rejoined-room");
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Odaya yeniden girilemedi.";
      setErrorMessage(message);
    } finally {
      setBusySavedRoomCode(null);
    }
  }

  async function copyShareLink(roomCode: string) {
    const shareUrl = `${window.location.origin}/invite?code=${roomCode}`;
    await navigator.clipboard.writeText(shareUrl);
    setMessage("Paylaşım linki kopyalandı.");
    setErrorMessage(null);
  }

  async function joinRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setIsJoining(true);

    try {
      const normalizedCode = compactRoomCode(joinCode);

      if (normalizedCode.length < 4) {
        throw new Error("Partner kodu biraz daha uzun olmalı.");
      }

      const { error } = await supabase.rpc("join_room_by_code", {
        input_room_code: normalizedCode,
      });

      if (error) {
        throw error;
      }

      setMessage("Bağlantı tamamlandı. Özel odanıza geçiyoruz.");
      startTransition(() => {
        router.replace("/chat?welcome=joined-room");
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Odaya bağlanılamadı.";
      setErrorMessage(message);
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="section-shell w-full overflow-hidden rounded-[2rem] p-5 sm:p-8">
        <div className="mb-5 flex justify-end">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-2 text-sm font-medium shadow-soft transition hover:text-accent dark:bg-white/8"
          >
            <Cog className="h-4 w-4" />
            Ayarlar
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="glass-panel rounded-[1.75rem] p-6 sm:p-8">
            <div className="mb-8 flex items-center gap-4">
              <Avatar
                name={profile.displayName}
                seed={profile.avatarSeed}
                url={profile.avatarUrl}
                size="lg"
              />
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-muted">
                  Merhaba
                </p>
                <h1 className="font-display text-4xl font-semibold">
                  {profile.displayName}
                </h1>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Özel alanınızı kurmak için iki yolunuz var
              </h2>
              <p className="text-sm leading-7 text-muted">
                İlk kişi odayı oluşturur, ikinci kişi paylaşılan kodla katılır.
                Sonrası sadece ikinize ait: gerçek zamanlı mesajlar, yazıyor
                durumu ve bildirimler hazır.
              </p>
            </div>

            <div className="mt-8 rounded-[1.55rem] border border-border bg-white/54 p-5 shadow-soft dark:bg-white/6">
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-accent" />
                <p className="font-semibold">Güvenli eşleşme akışı</p>
              </div>
              <ul className="space-y-3 text-sm leading-6 text-muted">
                <li>Supabase Auth + RLS ile yalnızca üye olduğun oda görünür.</li>
                <li>Aynı anda tek aktif odada olursun, ama istersen sonra odadan çıkabilirsin.</li>
                <li>Bir odada en fazla iki kişi bulunur.</li>
              </ul>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article
              className={cn(
                "glass-panel rounded-[1.75rem] p-6 transition",
                hasPrefilledCode && "border-accent bg-accent-soft/20 shadow-soft",
              )}
            >
              <div className="mb-6">
                <p className="mb-2 text-sm uppercase tracking-[0.24em] text-muted">
                  01
                </p>
                <h2 className="mb-3 font-display text-3xl font-semibold">
                  Yeni oda oluştur
                </h2>
                <p className="text-sm leading-6 text-muted">
                  Sen ilk giren kişiyse odanı hazırla. Uygulama senin için bir
                  oda kodu oluşturacak.
                </p>
              </div>
              <button
                type="button"
                disabled={isCreating}
                onClick={createRoom}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition",
                  "bg-[linear-gradient(135deg,#b24d74_0%,#d07c8f_100%)] shadow-soft hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70",
                )}
              >
                {isCreating ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Odayı hazırla
              </button>
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium">Özel oda kodu (opsiyonel)</span>
                <input
                  className="w-full rounded-2xl border border-border bg-white/78 px-4 py-3 font-medium tracking-[0.12em] uppercase outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10 dark:bg-white/7"
                  placeholder="BIZIMODA2026"
                  value={customRoomCode}
                  onChange={(event) => setCustomRoomCode(compactRoomCode(event.target.value))}
                />
                <p className="text-xs leading-5 text-muted">
                  Eğer bu kod boşsa sistem sana otomatik bir oda kodu üretir. Doluysa ve kullanımda değilse o kodla oda açılır.
                </p>
              </label>
            </article>

            <article className="glass-panel rounded-[1.75rem] p-6">
              <div className="mb-6">
                <p className="mb-2 text-sm uppercase tracking-[0.24em] text-muted">
                  02
                </p>
                <h2 className="mb-3 font-display text-3xl font-semibold">
                  Koda katıl
                </h2>
                <p className="text-sm leading-6 text-muted">
                  Partnerin sana oda kodu paylaştıysa onu buraya yaz. Bağlantı
                  olunca doğrudan sohbet ekranına geçilir.
                </p>
              </div>

              <form className="space-y-4" onSubmit={joinRoom}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Partner kodu</span>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      className={cn(
                        "w-full rounded-2xl border bg-white/78 py-3 pl-11 pr-4 font-medium tracking-[0.22em] uppercase outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/10 dark:bg-white/7",
                        hasPrefilledCode ? "border-accent ring-3 ring-accent/10" : "border-border",
                      )}
                      placeholder="AB12CD34"
                      value={joinCode}
                      onChange={(event) => setJoinCode(compactRoomCode(event.target.value))}
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isJoining}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition dark:bg-white/8",
                    hasPrefilledCode
                      ? "border-accent bg-accent-soft/35 text-foreground shadow-soft hover:text-accent"
                      : "border-border bg-white/72 hover:border-accent hover:text-accent",
                  )}
                >
                  {isJoining ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Kontrol ediliyor
                    </span>
                  ) : (
                    "Koda bağlan"
                  )}
                </button>
              </form>
            </article>
          </div>
        </div>

        {savedRooms.length > 0 ? (
          <div className="mt-6 glass-panel rounded-[1.75rem] p-5 sm:p-6">
            <div className="mb-4">
              <p className="mb-2 text-sm uppercase tracking-[0.24em] text-muted">
                Kayıt defteri
              </p>
              <h2 className="font-display text-3xl font-semibold">
                Daha önce girdiğin odalar
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Buradan eski odalarına tekrar girebilir, partnerin odada değilse link ya da e-posta ile geri çağırabilirsin.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {savedRooms.map((room) => {
                const shareDisabled = room.activeMemberCount >= 2;
                const roomLink = `/invite?code=${room.roomCode}`;

                return (
                  <article
                    key={room.roomId}
                    className="rounded-[1.5rem] border border-border bg-white/58 p-5 shadow-soft dark:bg-white/6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted">
                          Oda kodu
                        </p>
                        <p className="mt-1 break-all font-display text-2xl tracking-[0.14em]">
                          {room.roomCode}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-white/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted dark:bg-white/8">
                        {room.activeMemberCount}/2 aktif
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted">
                      {formatSavedRoomState(room)}
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-muted">
                      <p>Son giriş: {new Date(room.lastJoinedAt).toLocaleString("tr-TR")}</p>
                      {room.lastLeftAt ? (
                        <p>Son ayrılış: {new Date(room.lastLeftAt).toLocaleString("tr-TR")}</p>
                      ) : null}
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={busySavedRoomCode === room.roomCode || room.activeMemberCount >= 2}
                        onClick={() => void joinSpecificRoom(room.roomCode)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {busySavedRoomCode === room.roomCode ? "Giriliyor..." : "Yeniden gir"}
                      </button>
                      <button
                        type="button"
                        disabled={shareDisabled}
                        onClick={() => void copyShareLink(room.roomCode)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-semibold transition hover:text-accent disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                      >
                        <Link2 className="h-4 w-4" />
                        Linki kopyala
                      </button>
                    </div>

                    {!shareDisabled ? (
                      <p className="mt-3 break-all text-xs text-muted">{roomLink}</p>
                    ) : (
                      <p className="mt-3 text-xs text-muted">
                        Oda zaten dolu görünüyor; bu yüzden yeni davet linki önerilmiyor.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-6 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
