import { MESSAGE_LIMIT } from "@/lib/constants";
import type { ChatBootstrap, MessageSummary, PresenceSummary, ProfileSummary, RoomSummary, SavedRoomSummary, TypingSummary } from "@/types/chat";
import type { Database } from "@/types/database";

type SupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>
>;

function mapProfile(row: Database["public"]["Tables"]["profiles"]["Row"]): ProfileSummary {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarSeed: row.avatar_seed,
    avatarUrl: row.avatar_url,
  };
}

function mapRoom(
  row: Database["public"]["Tables"]["chat_rooms"]["Row"],
  memberCount: number,
): RoomSummary {
  return {
    id: row.id,
    roomCode: row.room_code,
    createdAt: row.created_at,
    lastMessageAt: row.last_message_at,
    memberCount,
  };
}

function mapMessage(
  row: Database["public"]["Tables"]["messages"]["Row"],
): MessageSummary {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    body: row.body,
    status: row.status,
    metadata: row.metadata,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function mapPresence(
  row: Database["public"]["Tables"]["user_presence"]["Row"],
): PresenceSummary {
  return {
    userId: row.user_id,
    isOnline: row.is_online,
    activeRoomId: row.active_room_id,
    lastSeenAt: row.last_seen_at,
  };
}

function mapTyping(
  row: Database["public"]["Tables"]["typing_status"]["Row"],
): TypingSummary {
  return {
    userId: row.user_id,
    isTyping: row.is_typing,
    updatedAt: row.updated_at,
  };
}

function mapSavedRoom(
  row: Database["public"]["Functions"]["get_saved_rooms"]["Returns"][number],
): SavedRoomSummary {
  return {
    roomId: row.room_id,
    roomCode: row.room_code,
    lastMessageAt: row.last_message_at,
    lastJoinedAt: row.last_joined_at,
    lastLeftAt: row.last_left_at,
    activeMemberCount: row.active_member_count,
    activePartnerName: row.active_partner_name,
  };
}

export async function getProfileById(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProfile(data);
}

export async function getChatBootstrap(
  supabase: SupabaseClient,
  userId: string,
  roomId: string,
): Promise<ChatBootstrap> {
  const [profileResult, roomResult, membersResult, messagesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("chat_rooms").select("*").eq("id", roomId).single(),
    supabase.from("chat_room_members").select("user_id").eq("room_id", roomId),
    supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(MESSAGE_LIMIT),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (roomResult.error) {
    throw new Error(roomResult.error.message);
  }

  if (membersResult.error) {
    throw new Error(membersResult.error.message);
  }

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message);
  }

  const memberIds = membersResult.data.map((member) => member.user_id);
  const partnerId = memberIds.find((memberId) => memberId !== userId) ?? null;

  const [partnerResult, presenceResult, typingResult] = await Promise.all([
    partnerId
      ? supabase.from("profiles").select("*").eq("id", partnerId).single()
      : Promise.resolve({ data: null, error: null }),
    partnerId
      ? supabase.from("user_presence").select("*").eq("user_id", partnerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    partnerId
      ? supabase
          .from("typing_status")
          .select("*")
          .eq("room_id", roomId)
          .eq("user_id", partnerId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    currentUser: mapProfile(profileResult.data),
    room: mapRoom(roomResult.data, memberIds.length),
    partner: partnerResult.data ? mapProfile(partnerResult.data) : null,
    initialMessages: messagesResult.data.map(mapMessage),
    partnerPresence: presenceResult.data ? mapPresence(presenceResult.data) : null,
    partnerTyping: typingResult.data ? mapTyping(typingResult.data) : null,
  };
}

export async function getSettingsSnapshot(
  supabase: SupabaseClient,
  userId: string,
  roomId: string | null,
) {
  const profile = await getProfileById(supabase, userId);

  if (!roomId) {
    return {
      profile,
      roomCode: null,
      partnerName: null,
      roomMemberCount: 0,
    };
  }

  const [roomResult, membersResult] = await Promise.all([
    supabase.from("chat_rooms").select("room_code").eq("id", roomId).single(),
    supabase.from("chat_room_members").select("user_id").eq("room_id", roomId),
  ]);

  if (roomResult.error) {
    throw new Error(roomResult.error.message);
  }

  if (membersResult.error) {
    throw new Error(membersResult.error.message);
  }

  const partnerId =
    membersResult.data.find((member) => member.user_id !== userId)?.user_id ?? null;

  const partnerResult = partnerId
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", partnerId)
        .maybeSingle()
    : { data: null, error: null };

  if (partnerResult.error) {
    throw new Error(partnerResult.error.message);
  }

  return {
    profile,
    roomCode: roomResult.data.room_code,
    partnerName: partnerResult.data?.display_name ?? null,
    roomMemberCount: membersResult.data.length,
  };
}

export async function getInviteSnapshot(
  supabase: SupabaseClient,
  userId: string,
) {
  const [profile, savedRoomsResult] = await Promise.all([
    getProfileById(supabase, userId),
    supabase.rpc("get_saved_rooms"),
  ]);

  if (savedRoomsResult.error) {
    throw new Error(savedRoomsResult.error.message);
  }

  return {
    profile,
    savedRooms: (savedRoomsResult.data ?? []).map(mapSavedRoom),
  };
}
