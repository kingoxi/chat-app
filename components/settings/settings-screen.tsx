"use client";

import { startTransition, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Camera,
  ChevronLeft,
  DoorOpen,
  KeyRound,
  LogOut,
  Mail,
  MoonStar,
  Palette,
  SunMedium,
  Trash2,
  UserPen,
  Volume2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { PwaSettingsCard } from "@/components/pwa/pwa-settings-card";
import { Avatar } from "@/components/profile/avatar";
import { useChatPreferences } from "@/hooks/use-chat-preferences";
import { ACCENT_THEMES } from "@/lib/appearance";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { ProfileSummary } from "@/types/chat";

type SettingsScreenProps = {
  profile: ProfileSummary;
  roomCode: string | null;
  partnerName: string | null;
  roomMemberCount: number;
};

type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-[1.75rem] p-5 sm:p-6">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function NoticeBanner({ notice }: { notice: Notice | null }) {
  if (!notice) {
    return null;
  }

  const toneClass =
    notice.tone === "success"
      ? "border-success/30 bg-success/10 text-success"
      : notice.tone === "error"
        ? "border-danger/30 bg-danger/10 text-danger"
        : "border-border bg-white/55 text-foreground dark:bg-white/6";

  return (
    <div className={`rounded-[1.1rem] border px-4 py-3 text-sm ${toneClass}`}>
      {notice.text}
    </div>
  );
}

function extractAvatarPath(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/avatars/";
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export function SettingsScreen({
  profile,
  roomCode,
  partnerName,
  roomMemberCount,
}: SettingsScreenProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { setTheme, resolvedTheme } = useTheme();
  const {
    accentTheme,
    setAccentTheme,
    notificationPermission,
    notificationsEnabled,
    requestNotificationPermission,
    setNotificationsEnabled,
    soundEnabled,
    setSoundEnabled,
  } = useChatPreferences();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice | null>(null);
  const [securityNotice, setSecurityNotice] = useState<Notice | null>(null);
  const [avatarNotice, setAvatarNotice] = useState<Notice | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [leavePhrase, setLeavePhrase] = useState("");
  const [leaveNotice, setLeaveNotice] = useState<Notice | null>(null);
  const [leavingRoom, setLeavingRoom] = useState(false);
  const [keepRoomOnLeave, setKeepRoomOnLeave] = useState(true);

  function handleThemeChange(nextTheme: "light" | "dark") {
    if (nextTheme === "light" && accentTheme === "obsidian") {
      setAccentTheme("rose");
    }

    setTheme(nextTheme);
  }

  function handleAccentThemeChange(nextAccentTheme: typeof accentTheme) {
    setAccentTheme(nextAccentTheme);

    if (nextAccentTheme === "obsidian") {
      setTheme("dark");
    }
  }

  function refreshRoute() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function handleProfileSave() {
    const trimmedName = displayName.trim();

    if (trimmedName.length < 2) {
      setProfileNotice({
        tone: "error",
        text: "İsmin en az 2 karakter olmalı.",
      });
      return;
    }

    setProfileSaving(true);
    setProfileNotice(null);

    const profileUpdate = await supabase
      .from("profiles")
      .update({
        display_name: trimmedName,
        avatar_url: avatarUrl,
      })
      .eq("id", profile.id);

    if (profileUpdate.error) {
      setProfileSaving(false);
      setProfileNotice({
        tone: "error",
        text: "Profil şu an kaydedilemedi. Lütfen tekrar dene.",
      });
      return;
    }

    const authUpdate = await supabase.auth.updateUser({
      data: {
        display_name: trimmedName,
      },
    });

    if (authUpdate.error) {
      setProfileSaving(false);
      setProfileNotice({
        tone: "error",
        text: "Profil adı kaydedildi ama auth bilgisi güncellenemedi.",
      });
      return;
    }

    setProfileSaving(false);
    setProfileNotice({
      tone: "success",
      text: "Profilin güncellendi.",
    });
    refreshRoute();
  }

  async function handleEmailSave() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail.includes("@")) {
      setSecurityNotice({
        tone: "error",
        text: "Geçerli bir e-posta adresi yaz.",
      });
      return;
    }

    setEmailSaving(true);
    setSecurityNotice(null);

    const { error } = await supabase.auth.updateUser({
      email: trimmedEmail,
    });

    setEmailSaving(false);

    if (error) {
      setSecurityNotice({
        tone: "error",
        text: "E-posta güncellenemedi. Adres kullanımda olabilir ya da doğrulama ayarı engelliyor olabilir.",
      });
      return;
    }

    setSecurityNotice({
      tone: "success",
      text: "Doğrulama gerekiyorsa yeni e-posta adresine bir onay maili gönderildi.",
    });
    refreshRoute();
  }

  async function handlePasswordSave() {
    if (newPassword.length < 6) {
      setSecurityNotice({
        tone: "error",
        text: "Yeni şifre en az 6 karakter olmalı.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityNotice({
        tone: "error",
        text: "Şifreler birbiriyle aynı değil.",
      });
      return;
    }

    setPasswordSaving(true);
    setSecurityNotice(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setPasswordSaving(false);

    if (error) {
      setSecurityNotice({
        tone: "error",
        text: "Şifre güncellenemedi. Lütfen tekrar dene.",
      });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setSecurityNotice({
      tone: "success",
      text: "Şifren güncellendi.",
    });
  }

  async function handleAvatarUpload(file: File | null) {
    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setAvatarNotice({
        tone: "error",
        text: "Avatar için PNG, JPG ya da WEBP kullan.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarNotice({
        tone: "error",
        text: "Avatar en fazla 5 MB olabilir.",
      });
      return;
    }

    setAvatarSaving(true);
    setAvatarNotice(null);

    const previousAvatarPath = extractAvatarPath(avatarUrl);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${profile.id}/${Date.now()}.${extension}`;

    const uploadResult = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadResult.error) {
      setAvatarSaving(false);
      setAvatarNotice({
        tone: "error",
        text: "Avatar yüklenemedi. Storage ayarını ve SQL migration dosyasını kontrol et.",
      });
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);

    const profileUpdate = await supabase
      .from("profiles")
      .update({
        avatar_url: data.publicUrl,
      })
      .eq("id", profile.id);

    if (profileUpdate.error) {
      setAvatarSaving(false);
      setAvatarNotice({
        tone: "error",
        text: "Avatar kaydı profile işlenemedi.",
      });
      return;
    }

    if (previousAvatarPath && previousAvatarPath !== path) {
      await supabase.storage.from("avatars").remove([previousAvatarPath]);
    }

    setAvatarUrl(data.publicUrl);
    setAvatarSaving(false);
    setAvatarNotice({
      tone: "success",
      text: "Yeni avatarın kaydedildi.",
    });
    refreshRoute();
  }

  async function handleAvatarReset() {
    setAvatarSaving(true);
    setAvatarNotice(null);

    const previousAvatarPath = extractAvatarPath(avatarUrl);
    const profileUpdate = await supabase
      .from("profiles")
      .update({
        avatar_url: null,
      })
      .eq("id", profile.id);

    if (profileUpdate.error) {
      setAvatarSaving(false);
      setAvatarNotice({
        tone: "error",
        text: "Avatar kaldırılırken bir sorun oldu.",
      });
      return;
    }

    if (previousAvatarPath) {
      await supabase.storage.from("avatars").remove([previousAvatarPath]);
    }

    setAvatarUrl(null);
    setAvatarSaving(false);
    setAvatarNotice({
      tone: "success",
      text: "Avatar kaldırıldı. Baş harf görünümüne döndün.",
    });
    refreshRoute();
  }

  async function handleLeaveRoom() {
    if (!roomCode) {
      setLeaveNotice({
        tone: "info",
        text: "Şu anda bağlı olduğun bir oda yok.",
      });
      return;
    }

    if (leavePhrase.trim().toLowerCase() !== "geri gelecem") {
      setLeaveNotice({
        tone: "error",
        text: "Odadan çıkmak için doğrulama metnini tam olarak `geri gelecem` yazman gerekiyor.",
      });
      return;
    }

    setLeavingRoom(true);
    setLeaveNotice(null);

    const { error } = await supabase.rpc("leave_current_room", {
      input_confirmation: leavePhrase,
      input_keep_room: roomMemberCount === 1 ? keepRoomOnLeave : false,
    });

    setLeavingRoom(false);

    if (error) {
      const normalizedMessage = error.message.toLowerCase();
      setLeaveNotice({
        tone: "error",
        text:
          normalizedMessage.includes("confirmation")
            ? "Gizli çıkış kodu eşleşmedi."
            : "Şu an odadan çıkılamadı. Lütfen tekrar dene.",
      });
      return;
    }

    setLeaveNotice({
      tone: "success",
      text: "Odadan ayrıldın. Seni yeni oda ekranına yönlendiriyoruz.",
    });

    startTransition(() => {
      router.replace("/invite?welcome=leftroom");
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl min-w-0 flex-col overflow-hidden px-4 py-6 sm:px-6">
      <div className="mb-5 flex shrink-0 items-center justify-between gap-4">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-2 text-sm font-medium shadow-soft transition hover:text-accent dark:bg-white/8"
        >
          <ChevronLeft className="h-4 w-4" />
          Sohbete dön
        </Link>
        <button
          type="button"
          disabled={signingOut}
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-2 text-sm font-medium shadow-soft transition hover:text-danger disabled:opacity-70 dark:bg-white/8"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Çıkış..." : "Çıkış yap"}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto xl:overflow-hidden xl:grid-cols-[1.02fr_1.18fr]">
        <div className="space-y-5 xl:chat-scrollbar xl:min-h-0 xl:overflow-x-hidden xl:overflow-y-auto xl:pr-1">
          <section className="section-shell overflow-hidden rounded-[1.9rem] p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar
                name={displayName}
                seed={profile.avatarSeed}
                url={avatarUrl}
                size="xl"
                className="ring-4 ring-white/50 dark:ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm uppercase tracking-[0.28em] text-muted">
                  Senin profilin
                </p>
                <h1 className="mt-2 break-words font-display text-4xl font-semibold">
                  {displayName}
                </h1>
                <p className="mt-2 break-all text-sm text-muted">{email}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-border bg-white/55 p-4 shadow-soft dark:bg-white/6">
                <p className="text-sm text-muted">Bağlı partner</p>
                <p className="mt-1 break-words font-semibold">
                  {partnerName ?? "Henüz bağlanmadı"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-border bg-white/55 p-4 shadow-soft dark:bg-white/6">
                <p className="text-sm text-muted">Oda kodu</p>
                <p className="mt-1 break-all font-display text-2xl tracking-[0.14em]">
                  {roomCode ?? "Yok"}
                </p>
              </div>
            </div>
          </section>

          <SettingsCard
            title="Profilini düzenle"
            description="İsmini ve avatarını değiştir. Bu görünüm chat başlığında ve davet ekranında da kullanılır."
          >
            <div className="space-y-4">
              <NoticeBanner notice={profileNotice ?? avatarNotice} />

              <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                <div className="space-y-3">
                  <Avatar
                    name={displayName}
                    seed={profile.avatarSeed}
                    url={avatarUrl}
                    size="lg"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:text-accent">
                    <Camera className="h-4 w-4" />
                    {avatarSaving ? "Yükleniyor..." : "Avatar yükle"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={avatarSaving}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        void handleAvatarUpload(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!avatarUrl || avatarSaving}
                    onClick={() => void handleAvatarReset()}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Avatarı kaldır
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <UserPen className="h-4 w-4 text-accent" />
                      Görünen isim
                    </span>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="w-full rounded-[1.2rem] border border-border bg-white/65 px-4 py-3 outline-none transition focus:border-accent dark:bg-white/6"
                      placeholder="Örn. Deniz"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={profileSaving}
                    onClick={() => void handleProfileSave()}
                    className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-70"
                  >
                    {profileSaving ? "Kaydediliyor..." : "Profili kaydet"}
                  </button>
                </div>
              </div>
            </div>
          </SettingsCard>
        </div>

        <div className="space-y-5 xl:chat-scrollbar xl:min-h-0 xl:overflow-x-hidden xl:overflow-y-auto xl:pr-1">
          <SettingsCard
            title="Tema ve görünüm"
            description="Instagram chat hissine daha yakın bir görünüm için renk tonunu ve ışık modunu değiştir."
          >
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleThemeChange("light")}
                  className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${
                    resolvedTheme === "light"
                      ? "border-accent bg-accent-soft text-foreground"
                      : "border-border bg-white/60 dark:bg-white/5"
                  }`}
                >
                  <SunMedium className="mb-3 h-5 w-5" />
                  <p className="font-semibold">Light</p>
                  <p className="text-sm text-muted">Aydınlık, sıcak ve daha canlı ekranlar için.</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange("dark")}
                  className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${
                    resolvedTheme === "dark"
                      ? "border-accent bg-accent-soft text-foreground"
                      : "border-border bg-white/60 dark:bg-white/5"
                  }`}
                >
                  <MoonStar className="mb-3 h-5 w-5" />
                  <p className="font-semibold">Dark</p>
                  <p className="text-sm text-muted">Gece yazışmaları için daha sinematik görünüm.</p>
                </button>
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-sm font-medium">
                  <Palette className="h-4 w-4 text-accent" />
                  Sohbet tonu
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ACCENT_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleAccentThemeChange(theme.id)}
                      className={`rounded-[1.35rem] border p-4 text-left transition ${
                        accentTheme === theme.id
                          ? "border-accent bg-accent-soft/70 text-foreground shadow-soft"
                          : "border-border bg-white/52 dark:bg-white/5"
                      }`}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span
                          className="h-10 w-10 rounded-2xl shadow-soft"
                          style={{
                            background:
                              theme.id === "rose"
                                ? "linear-gradient(135deg, #b24d74 0%, #d48ca4 100%)"
                                : theme.id === "sunset"
                                  ? "linear-gradient(135deg, #d95b43 0%, #f0a15c 100%)"
                                  : theme.id === "violet"
                                    ? "linear-gradient(135deg, #7b57d9 0%, #b18dff 100%)"
                                    : theme.id === "ocean"
                                      ? "linear-gradient(135deg, #16889d 0%, #61c9be 100%)"
                                      : "linear-gradient(135deg, #0d0d11 0%, #454552 100%)",
                          }}
                        />
                        <div>
                          <p className="font-semibold">{theme.name}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">
                            {accentTheme === theme.id ? "Seçili" : "Tema"}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm leading-6 text-muted">{theme.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Hesap ve güvenlik"
            description="E-posta ve şifreni buradan güncelleyebilirsin."
          >
            <div className="space-y-4">
              <NoticeBanner notice={securityNotice} />

              <label className="block space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-accent" />
                  E-posta adresi
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-[1.2rem] border border-border bg-white/65 px-4 py-3 outline-none transition focus:border-accent dark:bg-white/6"
                  placeholder="mail@ornek.com"
                />
              </label>

              <button
                type="button"
                disabled={emailSaving}
                onClick={() => void handleEmailSave()}
                className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:text-accent disabled:opacity-70"
              >
                {emailSaving ? "Güncelleniyor..." : "E-postayı güncelle"}
              </button>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <KeyRound className="h-4 w-4 text-accent" />
                    Yeni şifre
                  </span>
                  <div className="rounded-[1.2rem] border border-border bg-white/65 px-4 py-3 dark:bg-white/6">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full bg-transparent outline-none"
                      placeholder="Yeni şifren"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="mt-2 text-xs font-medium text-muted transition hover:text-accent"
                    >
                      {showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    </button>
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Şifreyi tekrar yaz</span>
                  <div className="rounded-[1.2rem] border border-border bg-white/65 px-4 py-3 dark:bg-white/6">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full bg-transparent outline-none"
                      placeholder="Tekrar yaz"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="mt-2 text-xs font-medium text-muted transition hover:text-accent"
                    >
                      {showConfirmPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    </button>
                  </div>
                </label>
              </div>

              <button
                type="button"
                disabled={passwordSaving}
                onClick={() => void handlePasswordSave()}
                className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-70"
              >
                {passwordSaving ? "Kaydediliyor..." : "Şifreyi güncelle"}
              </button>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Oda yönetimi"
            description="İstersen mevcut odandan ayrılabilir ve sonra yeni bir oda kurabilirsin."
          >
            <div className="space-y-4">
              <NoticeBanner notice={leaveNotice} />

              <div className="rounded-[1.3rem] border border-danger/20 bg-danger/8 p-4 text-sm leading-6 text-muted">
                Mevcut odandan çıkarsan sohbet ekranına erişimin kapanır. Tekrar girmek istersen yeni oda oluşturabilir ya da başka bir room code ile bağlanabilirsin.
              </div>

              {roomMemberCount === 1 ? (
                <label className="flex items-center justify-between rounded-[1.3rem] border border-border bg-white/58 px-4 py-4 dark:bg-white/6">
                  <span className="pr-4">
                    <span className="block font-semibold">Odadan çıkınca oda kayıtta kalsın</span>
                    <span className="block text-sm text-muted">
                      Son kişi sensen bu açık kalırsa oda silinmez; invite sayfasındaki kayıt defterinden tekrar girebilirsin.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--accent)]"
                    checked={keepRoomOnLeave}
                    onChange={(event) => setKeepRoomOnLeave(event.target.checked)}
                  />
                </label>
              ) : null}

              <div className="rounded-[1.3rem] border border-border bg-white/58 p-4 dark:bg-white/6">
                <p className="font-semibold">Gizli çıkış kodu</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Çıkışı onaylamak için aşağıya tam olarak <span className="font-semibold text-foreground">geri gelecem</span> yaz.
                </p>
                <input
                  value={leavePhrase}
                  onChange={(event) => setLeavePhrase(event.target.value)}
                  placeholder="geri gelecem"
                  className="mt-3 w-full rounded-[1.2rem] border border-border bg-white/70 px-4 py-3 outline-none transition focus:border-danger dark:bg-white/6"
                />
              </div>

              <button
                type="button"
                disabled={leavingRoom || !roomCode}
                onClick={() => void handleLeaveRoom()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-danger px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <DoorOpen className="h-4 w-4" />
                {leavingRoom ? "Çıkılıyor..." : "Odadan çık"}
              </button>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Bildirimler"
            description="Sekme kapalıyken tarayıcı bildirimi, açıksa uygulama içi bildirim kullanılır."
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-[1.3rem] border border-border bg-white/58 p-4 dark:bg-white/6">
                <Bell className="mt-0.5 h-5 w-5 text-accent" />
                <div className="flex-1">
                  <p className="font-semibold">Tarayıcı bildirimi izni</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Durum: {notificationPermission}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const permission = await requestNotificationPermission();
                    if (permission !== "granted") {
                      setNotificationsEnabled(false);
                    }
                  }}
                  className="rounded-full border border-border px-3 py-2 text-sm font-semibold transition hover:text-accent"
                >
                  İzin iste
                </button>
              </div>

              <label className="flex items-center justify-between rounded-[1.3rem] border border-border bg-white/58 px-4 py-4 dark:bg-white/6">
                <span>
                  <span className="block font-semibold">Tarayıcı bildirimi açık</span>
                  <span className="block text-sm text-muted">
                    Sadece izin verildiyse çalışır.
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--accent)]"
                  checked={notificationsEnabled}
                  disabled={notificationPermission !== "granted"}
                  onChange={(event) =>
                    setNotificationsEnabled(event.target.checked)
                  }
                />
              </label>

              <label className="flex items-center justify-between rounded-[1.3rem] border border-border bg-white/58 px-4 py-4 dark:bg-white/6">
                <span className="inline-flex items-start gap-3">
                  <Volume2 className="mt-1 h-5 w-5 text-accent" />
                  <span>
                    <span className="block font-semibold">Mesaj sesi</span>
                    <span className="block text-sm text-muted">
                      Yeni mesaj geldiğinde kısa bir bildirim tonu çalar.
                    </span>
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--accent)]"
                  checked={soundEnabled}
                  onChange={(event) => setSoundEnabled(event.target.checked)}
                />
              </label>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Telefonunda kullan"
            description="Heartline'i ana ekrana ekleyip uygulama gibi açabilir, zayıf bağlantıda daha dayanıklı kullanabilirsin."
          >
            <PwaSettingsCard />
          </SettingsCard>
        </div>
      </div>
    </main>
  );
}
