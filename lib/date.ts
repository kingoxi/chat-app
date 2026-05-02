import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  parseISO,
} from "date-fns";
import { tr } from "date-fns/locale/tr";
import { ONLINE_THRESHOLD_MS } from "@/lib/constants";
import type { MessageDeliveryState } from "@/types/database";

export function formatChatDay(value: string) {
  const date = parseISO(value);

  if (isToday(date)) {
    return "Bugün";
  }

  if (isYesterday(date)) {
    return "Dün";
  }

  return format(date, "d MMMM yyyy", { locale: tr });
}

export function formatMessageTime(value: string) {
  return format(parseISO(value), "HH:mm", { locale: tr });
}

export function formatAudioDuration(durationMs: number) {
  const totalSeconds = Math.max(Math.round(durationMs / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatLastSeen(value: string | null | undefined) {
  if (!value) {
    return "Henüz görünmedi";
  }

  return `son görülme ${formatDistanceToNow(parseISO(value), {
    addSuffix: true,
    locale: tr,
  })}`;
}

export function isPresenceOnline(lastSeenAt: string | null | undefined, isOnline: boolean) {
  if (!lastSeenAt) {
    return false;
  }

  const delta = Date.now() - parseISO(lastSeenAt).getTime();
  return isOnline && delta < ONLINE_THRESHOLD_MS;
}

export function getMessageStateLabel(
  status: MessageDeliveryState,
  readAt: string | null,
) {
  if (status === "read" || readAt) {
    return "okundu";
  }

  if (status === "delivered") {
    return "iletildi";
  }

  return "gonderildi";
}
