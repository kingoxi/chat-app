"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatPreferencesContext } from "@/hooks/use-chat-preferences";
import type { AccentTheme } from "@/lib/appearance";

const SOUND_KEY = "heartline.soundEnabled";
const NOTIFICATION_KEY = "heartline.notificationsEnabled";
const ACCENT_KEY = "heartline.accentTheme";

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(SOUND_KEY) !== "false";
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(NOTIFICATION_KEY) === "true";
  });
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => {
    if (typeof window === "undefined") {
      return "rose";
    }

    const storedValue = window.localStorage.getItem(ACCENT_KEY);
    if (
      storedValue === "sunset" ||
      storedValue === "violet" ||
      storedValue === "ocean" ||
      storedValue === "obsidian"
    ) {
      return storedValue;
    }

    return "rose";
  });
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window === "undefined") {
      return "default";
    }

    if ("Notification" in window) {
      return Notification.permission;
    }

    return "unsupported";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SOUND_KEY, String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      NOTIFICATION_KEY,
      String(notificationsEnabled),
    );
  }, [notificationsEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ACCENT_KEY, accentTheme);
    document.documentElement.dataset.accentTheme = accentTheme;
  }, [accentTheme]);

  const value = useMemo(
    () => ({
      soundEnabled,
      setSoundEnabled,
      notificationsEnabled,
      setNotificationsEnabled,
      accentTheme,
      setAccentTheme,
      notificationPermission,
      requestNotificationPermission: async () => {
        if (typeof window === "undefined" || !("Notification" in window)) {
          setNotificationPermission("unsupported");
          return "unsupported" as const;
        }

        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        setNotificationsEnabled(permission === "granted");
        return permission;
      },
    }),
    [
      notificationPermission,
      notificationsEnabled,
      accentTheme,
      soundEnabled,
    ],
  );

  return (
    <ChatPreferencesContext.Provider value={value}>
      {children}
    </ChatPreferencesContext.Provider>
  );
}
