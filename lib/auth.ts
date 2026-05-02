import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getOptionalAuthContext() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub ?? null;

  if (error || !userId) {
    return {
      supabase,
      userId: null as string | null,
    };
  }

  return {
    supabase,
    userId,
  };
}

export async function requireUser() {
  const auth = await getOptionalAuthContext();

  if (!auth.userId) {
    redirect("/login");
  }

  return {
    supabase: auth.supabase,
    userId: auth.userId as string,
  };
}

export async function getUserRoomId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
) {
  const { data, error } = await supabase.rpc("get_my_room_id");

  if (!error) {
    return data ?? null;
  }

  const fallback = await supabase
    .from("chat_room_members")
    .select("room_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (fallback.data?.room_id) {
    return fallback.data.room_id;
  }

  const recovery = await supabase.rpc("recover_my_room_membership");
  if (!recovery.error && recovery.data) {
    return recovery.data;
  }

  return null;
}

export async function getAuthenticatedDestination() {
  const { supabase, userId } = await getOptionalAuthContext();

  if (!userId) {
    return null;
  }

  const roomId = await getUserRoomId(supabase, userId);
  return roomId ? "/chat" : "/invite";
}
