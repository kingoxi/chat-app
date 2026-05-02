import { redirect } from "next/navigation";
import { ChatScreen } from "@/components/chat/chat-screen";
import { getChatBootstrap } from "@/lib/chat-data";
import { getUserRoomId, requireUser } from "@/lib/auth";

export default async function ChatPage() {
  const { supabase, userId } = await requireUser();
  const roomId = await getUserRoomId(supabase, userId);

  if (!roomId) {
    redirect("/invite");
  }

  const data = await getChatBootstrap(supabase, userId, roomId);
  return <ChatScreen {...data} />;
}
