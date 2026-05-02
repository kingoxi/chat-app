import type { Json, MessageDeliveryState } from "@/types/database";

export type AudioMessageMetadata = {
  type: "audio";
  storageBucket: "chat-audio";
  storagePath: string;
  durationMs: number;
  mimeType: string;
  fileSize: number;
};

export type GifMessageMetadata = {
  type: "gif";
  gifId: string;
  sourceUrl: string;
  previewUrl: string;
  renderUrl: string;
  width: number;
  height: number;
  title: string | null;
};

export type MessageMetadata = Json | AudioMessageMetadata | GifMessageMetadata | null;

export type ProfileSummary = {
  id: string;
  email: string;
  displayName: string;
  avatarSeed: string;
  avatarUrl: string | null;
};

export type RoomSummary = {
  id: string;
  roomCode: string;
  createdAt: string;
  lastMessageAt: string | null;
  memberCount: number;
};

export type MessageSummary = {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  status: MessageDeliveryState;
  metadata: MessageMetadata;
  createdAt: string;
  readAt: string | null;
};

export type PresenceSummary = {
  userId: string;
  isOnline: boolean;
  activeRoomId: string | null;
  lastSeenAt: string;
};

export type TypingSummary = {
  userId: string;
  isTyping: boolean;
  updatedAt: string;
};

export type SavedRoomSummary = {
  roomId: string;
  roomCode: string;
  lastMessageAt: string | null;
  lastJoinedAt: string;
  lastLeftAt: string | null;
  activeMemberCount: number;
  activePartnerName: string | null;
};

export type ChatBootstrap = {
  currentUser: ProfileSummary;
  room: RoomSummary;
  partner: ProfileSummary | null;
  initialMessages: MessageSummary[];
  partnerPresence: PresenceSummary | null;
  partnerTyping: TypingSummary | null;
};
