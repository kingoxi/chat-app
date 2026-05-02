import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Avatar } from "@/components/profile/avatar";
import { formatLastSeen, isPresenceOnline } from "@/lib/date";
import type { PresenceSummary, ProfileSummary, RoomSummary } from "@/types/chat";

type ChatHeaderProps = {
  partner: ProfileSummary | null;
  room: RoomSummary;
  partnerPresence: PresenceSummary | null;
};

export function ChatHeader({
  partner,
  room,
  partnerPresence,
}: ChatHeaderProps) {
  const online = partnerPresence
    ? partnerPresence.activeRoomId === room.id &&
      isPresenceOnline(partnerPresence.lastSeenAt, partnerPresence.isOnline)
    : false;

  return (
    <header className="glass-panel sticky top-4 z-20 shrink-0 rounded-[1.8rem] px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <Avatar
          name={partner?.displayName ?? "Bekleniyor"}
          seed={partner?.avatarSeed}
          url={partner?.avatarUrl}
          size="md"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-semibold">
              {partner?.displayName ?? "Partner bekleniyor"}
            </h1>
            <span className="rounded-full border border-border bg-white/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted dark:bg-white/6">
              {room.roomCode}
            </span>
          </div>
          <p className="truncate text-sm text-muted">
            {partner
              ? online
                ? "su anda aktif"
                : formatLastSeen(partnerPresence?.lastSeenAt)
              : "Partnerin bu koda baglandiginda sohbet hemen canlanir."}
          </p>
        </div>
        <Link
          href="/settings"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-white/70 text-muted transition hover:text-accent dark:bg-white/8"
          aria-label="Ayarlar"
        >
          <Settings2 className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
