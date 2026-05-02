import { redirect } from "next/navigation";
import { InviteScreen } from "@/components/invite/invite-screen";
import { getInviteSnapshot } from "@/lib/chat-data";
import { getUserRoomId, requireUser } from "@/lib/auth";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; code?: string }>;
}) {
  const { supabase, userId } = await requireUser();
  const roomId = await getUserRoomId(supabase, userId);
  const resolvedSearchParams = await searchParams;

  if (roomId) {
    redirect("/chat");
  }

  const data = await getInviteSnapshot(supabase, userId);
  const welcomeMap: Record<string, string> = {
    registered: "Hesabın başarıyla oluşturuldu. Şimdi özel odanı kurabilirsin.",
    loggedin: "Giriş başarılı. Sıradaki adım özel odanı açmak veya bir koda katılmak.",
    leftroom: "Odadan ayrıldın. İstersen yeni bir oda kurabilir ya da başka bir koda katılabilirsin.",
  };

  return (
    <InviteScreen
      profile={data.profile}
      savedRooms={data.savedRooms}
      initialJoinCode={resolvedSearchParams.code ?? null}
      initialNotice={
        resolvedSearchParams.welcome
          ? (welcomeMap[resolvedSearchParams.welcome] ?? null)
          : null
      }
    />
  );
}
