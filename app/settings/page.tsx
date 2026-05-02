import { SettingsScreen } from "@/components/settings/settings-screen";
import { getSettingsSnapshot } from "@/lib/chat-data";
import { getUserRoomId, requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const { supabase, userId } = await requireUser();
  const roomId = await getUserRoomId(supabase, userId);
  const data = await getSettingsSnapshot(supabase, userId, roomId);

  return (
    <SettingsScreen
      profile={data.profile}
      roomCode={data.roomCode}
      partnerName={data.partnerName}
      roomMemberCount={data.roomMemberCount}
    />
  );
}
