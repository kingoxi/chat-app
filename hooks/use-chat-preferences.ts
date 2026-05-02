"use client";

import { createContext, useContext } from "react";

export type ChatPreferencesContextValue = {
  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  accentTheme: "rose" | "sunset" | "violet" | "ocean" | "obsidian";
  setAccentTheme: (value: "rose" | "sunset" | "violet" | "ocean" | "obsidian") => void;
  notificationPermission: NotificationPermission | "unsupported";
  requestNotificationPermission: () => Promise<NotificationPermission | "unsupported">;
};

export const ChatPreferencesContext =
  createContext<ChatPreferencesContextValue | null>(null);

export function useChatPreferences() {
  const context = useContext(ChatPreferencesContext);

  if (!context) {
    throw new Error("useChatPreferences must be used inside ChatPreferencesProvider.");
  }

  return context;
}
