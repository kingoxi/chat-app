"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BellRing, PencilLine, Radio, RefreshCcw, Save, Trash2, X } from "lucide-react";
import { ChatHeader } from "@/components/chat/chat-header";
import { EmptyChatState } from "@/components/chat/empty-chat-state";
import { MessageComposer } from "@/components/chat/message-composer";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Avatar } from "@/components/profile/avatar";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useChatPreferences } from "@/hooks/use-chat-preferences";
import { useMessageSound } from "@/hooks/use-message-sound";
import {
  APP_NAME,
  AUDIO_SIGNED_URL_TTL_SECONDS,
  CHAT_SYNC_INTERVAL_MS,
  GIPHY_SEARCH_LIMIT,
  MAX_MESSAGE_LENGTH,
  PARTNER_TYPING_VISIBLE_MS,
  PRESENCE_HEARTBEAT_MS,
  TYPING_IDLE_MS,
} from "@/lib/constants";
import {
  formatAudioDuration,
  formatChatDay,
  formatMessageTime,
  getMessageStateLabel,
} from "@/lib/date";
import {
  createGifMetadataFromUrl,
  buildGiphyPingbackUrl,
  getGifMessageMetadata,
  mapGiphyApiGif,
  type GiphySearchResult,
} from "@/lib/giphy";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  AudioMessageMetadata,
  ChatBootstrap,
  MessageSummary,
  PresenceSummary,
  ProfileSummary,
} from "@/types/chat";
import type { Database } from "@/types/database";

type ToastItem = {
  id: string;
  text: string;
};

function buildTimeline(messages: MessageSummary[]) {
  const items: Array<
    | { type: "day"; id: string; label: string }
    | { type: "message"; id: string; message: MessageSummary }
  > = [];

  let lastDay = "";

  for (const message of messages) {
    const label = formatChatDay(message.createdAt);

    if (label !== lastDay) {
      items.push({
        type: "day",
        id: `day-${label}-${message.id}`,
        label,
      });
      lastDay = label;
    }

    items.push({
      type: "message",
      id: message.id,
      message,
    });
  }

  return items;
}

function getAudioMessageMetadata(message: MessageSummary) {
  const metadata = message.metadata;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  if (
    metadata.type !== "audio" ||
    metadata.storageBucket !== "chat-audio" ||
    typeof metadata.storagePath !== "string" ||
    typeof metadata.durationMs !== "number" ||
    typeof metadata.mimeType !== "string" ||
    typeof metadata.fileSize !== "number"
  ) {
    return null;
  }

  return metadata as AudioMessageMetadata;
}

function mapRealtimeMessage(
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

function getAudioBubbleWidth(durationMs: number) {
  const durationSeconds = Math.max(durationMs / 1000, 1);
  const width = 180 + Math.min(durationSeconds, 60) * 2.4;
  return Math.max(190, Math.min(width, 340));
}

function getGifBubbleWidth(width: number, height: number) {
  if (!width || !height) {
    return 260;
  }

  const aspectRatio = width / height;
  if (aspectRatio >= 1.5) {
    return 300;
  }

  if (aspectRatio <= 0.8) {
    return 220;
  }

  return 260;
}

function getActionErrorMessage(prefix: string, error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);

    if (message.toLowerCase().includes("row-level security")) {
      return `${prefix} yetkisi icin son SQL migration'ini Supabase'te de calistir.`;
    }

    return `${prefix} (${message})`;
  }

  return prefix;
}

function normalizeMessageMetadata(metadata: MessageSummary["metadata"]) {
  return metadata ?? {};
}

async function ensureGiphyRandomId(
  apiKey: string,
  storageKey: string,
) {
  const existing =
    typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;

  if (existing) {
    return existing;
  }

  const url = new URL("https://api.giphy.com/v1/randomid");
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("Giphy random id alinamadi.");
  }

  const payload = (await response.json()) as {
    data?: { random_id?: string };
  };
  const randomId = payload.data?.random_id;

  if (!randomId) {
    throw new Error("Giphy random id bos dondu.");
  }

  window.localStorage.setItem(storageKey, randomId);
  return randomId;
}

export function ChatScreen({
  currentUser,
  room,
  partner,
  initialMessages,
  partnerPresence: initialPresence,
  partnerTyping: initialTyping,
}: ChatBootstrap) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { notificationsEnabled, notificationPermission, soundEnabled } =
    useChatPreferences();
  const playMessageSound = useMessageSound(soundEnabled);
  const {
    isRecording,
    durationMs: recordingDurationMs,
    audioDraft,
    error: audioError,
    isSupported: canRecordAudio,
    startRecording,
    stopRecording,
    clearDraft,
  } = useAudioRecorder();

  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GiphySearchResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<ProfileSummary | null>(partner);
  const [partnerPresence, setPartnerPresence] = useState<PresenceSummary | null>(
    initialPresence,
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showTyping, setShowTyping] = useState(Boolean(initialTyping?.isTyping));
  const [syncState, setSyncState] = useState<"connecting" | "live" | "polling">(
    "connecting",
  );
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [messageActionId, setMessageActionId] = useState<string | null>(null);

  const typingTimeoutRef = useRef<number | null>(null);
  const typingIndicatorTimeoutRef = useRef<number | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const seenIdsRef = useRef(new Set(initialMessages.map((message) => message.id)));
  const pendingAudioResolveRef = useRef(new Set<string>());
  const partnerIdRef = useRef<string | null>(partner?.id ?? null);
  const seenGifAnalyticsIdsRef = useRef(new Set<string>());
  const giphyApiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";
  const canUseGiphy = Boolean(giphyApiKey);
  const giphyRandomIdKey = useMemo(
    () => `giphy-random-id:${currentUser.id}`,
    [currentUser.id],
  );

  const timeline = useMemo(() => buildTimeline(messages), [messages]);

  useEffect(() => {
    partnerIdRef.current = partnerProfile?.id ?? null;
  }, [partnerProfile?.id]);

  const queueToast = (text: string) => {
    const toast = {
      id: crypto.randomUUID(),
      text,
    };

    setToasts((current) => [...current, toast]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 2800);
  };

  async function setTypingStatus(isTyping: boolean) {
    await supabase.rpc("set_typing_status", {
      input_room_id: room.id,
      input_is_typing: isTyping,
    });
  }

  function isMembershipError(error: unknown) {
    if (!error || typeof error !== "object" || !("message" in error)) {
      return false;
    }

    const message = String(error.message).toLowerCase();

    return (
      message.includes("row-level security") ||
      message.includes("permission denied") ||
      message.includes("not a member") ||
      message.includes("not linked to a room") ||
      message.includes("violates row-level security")
    );
  }

  async function recoverRoomMembership() {
    const recovery = await supabase.rpc("recover_my_room_membership");

    if (recovery.error || !recovery.data) {
      return null;
    }

    await syncLatestState();
    return recovery.data;
  }

  const sendGiphyPingback = useCallback(
    async (baseUrl: string | undefined) => {
      if (!baseUrl || !canUseGiphy) {
        return;
      }

      try {
        const randomId = await ensureGiphyRandomId(giphyApiKey, giphyRandomIdKey);
        const url = buildGiphyPingbackUrl(baseUrl, randomId);
        await fetch(url, { method: "GET", mode: "no-cors" });
      } catch {
        return;
      }
    },
    [canUseGiphy, giphyApiKey, giphyRandomIdKey],
  );

  async function insertMessageRow(
    body: string,
    metadata: MessageSummary["metadata"],
    recovered = false,
  ) {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: room.id,
        sender_id: currentUser.id,
        body,
        status: "sent",
        metadata: normalizeMessageMetadata(metadata),
      })
      .select()
      .single();

    if (error) {
      if (!recovered && isMembershipError(error)) {
        const recoveredRoomId = await recoverRoomMembership();

        if (recoveredRoomId) {
          return insertMessageRow(body, metadata, true);
        }
      }

      throw error;
    }

    return data;
  }

  function applyIncomingMessage(incoming: MessageSummary) {
    setMessages((current) => {
      const exists = current.some((message) => message.id === incoming.id);

      if (exists) {
        return current.map((message) =>
          message.id === incoming.id ? incoming : message,
        );
      }

      return [...current, incoming].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );
    });

    seenIdsRef.current.add(incoming.id);
  }

  function scheduleTypingIndicator(isTyping: boolean) {
    if (typingIndicatorTimeoutRef.current) {
      window.clearTimeout(typingIndicatorTimeoutRef.current);
    }

    setShowTyping(isTyping);

    if (isTyping) {
      typingIndicatorTimeoutRef.current = window.setTimeout(() => {
        setShowTyping(false);
      }, PARTNER_TYPING_VISIBLE_MS);
    }
  }

  const mergeMessage = useCallback((incoming: MessageSummary) => {
    applyIncomingMessage(incoming);
  }, []);

  const notifyPartnerMessage = useCallback(
    async (message: MessageSummary) => {
      if (!partnerProfile || message.senderId === currentUser.id) {
        return;
      }

      const audioMetadata = getAudioMessageMetadata(message);
      playMessageSound();

      if (document.hidden) {
        if (
          notificationsEnabled &&
          notificationPermission === "granted" &&
          "Notification" in window
        ) {
          const notification = new Notification(APP_NAME, {
            body: audioMetadata
              ? `${partnerProfile.displayName}: sesli mesaj gönderdi`
              : `${partnerProfile.displayName}: ${message.body.slice(0, 90)}`,
            tag: `room-${room.id}`,
          });

          notification.onclick = () => window.focus();
        }
      } else {
        queueToast(
          audioMetadata
            ? `${partnerProfile.displayName}: sesli mesaj gönderdi`
            : `${partnerProfile.displayName}: ${message.body.slice(0, 72)}`,
        );
      }
    },
    [
      currentUser.id,
      notificationPermission,
      notificationsEnabled,
      partnerProfile,
      playMessageSound,
      room.id,
    ],
  );

  const syncLatestState = useCallback(async () => {
    const [messagesResult, membersResult] = await Promise.all([
      supabase
        .from("messages")
        .select("*")
        .eq("room_id", room.id)
        .order("created_at", { ascending: true }),
      supabase.from("chat_room_members").select("user_id").eq("room_id", room.id),
    ]);

    if (!messagesResult.error && messagesResult.data) {
      const mappedMessages = messagesResult.data.map(mapRealtimeMessage);

      for (const message of mappedMessages) {
        const isNew = !seenIdsRef.current.has(message.id);
        applyIncomingMessage(message);

        if (isNew) {
          void notifyPartnerMessage(message);
        }
      }
    }

    if (!membersResult.error && membersResult.data) {
      const nextPartnerId =
        membersResult.data.find((member) => member.user_id !== currentUser.id)?.user_id ?? null;

      if (!nextPartnerId) {
        partnerIdRef.current = null;
        setPartnerProfile(null);
        setPartnerPresence(null);
        scheduleTypingIndicator(false);
        return;
      }

      const [partnerResult, presenceResult, typingResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", nextPartnerId).maybeSingle(),
        supabase.from("user_presence").select("*").eq("user_id", nextPartnerId).maybeSingle(),
        supabase
          .from("typing_status")
          .select("*")
          .eq("room_id", room.id)
          .eq("user_id", nextPartnerId)
          .maybeSingle(),
      ]);

      if (!partnerResult.error && partnerResult.data) {
        partnerIdRef.current = partnerResult.data.id;
        setPartnerProfile({
          id: partnerResult.data.id,
          email: partnerResult.data.email,
          displayName: partnerResult.data.display_name,
          avatarSeed: partnerResult.data.avatar_seed,
          avatarUrl: partnerResult.data.avatar_url,
        });
      }

      if (!presenceResult.error && presenceResult.data) {
        setPartnerPresence({
          userId: presenceResult.data.user_id,
          isOnline: presenceResult.data.is_online,
          activeRoomId: presenceResult.data.active_room_id,
          lastSeenAt: presenceResult.data.last_seen_at,
        });
      } else {
        setPartnerPresence(null);
      }

      if (!typingResult.error && typingResult.data) {
        scheduleTypingIndicator(typingResult.data.is_typing);
      } else {
        scheduleTypingIndicator(false);
      }
    }
  }, [currentUser.id, notifyPartnerMessage, room.id, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, showTyping]);

  useEffect(() => {
    if (!initialTyping?.isTyping) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setShowTyping(false);
    }, PARTNER_TYPING_VISIBLE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [initialTyping?.isTyping]);

  useEffect(() => {
    if (!gifOpen || !canUseGiphy) {
      return;
    }

    const query = gifQuery.trim();
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setGifLoading(true);
      setGifError(null);

      try {
        const endpoint = query
          ? "https://api.giphy.com/v1/gifs/search"
          : "https://api.giphy.com/v1/gifs/trending";
        const url = new URL(endpoint);
        url.searchParams.set("api_key", giphyApiKey);
        url.searchParams.set("limit", String(GIPHY_SEARCH_LIMIT));
        url.searchParams.set("rating", "g");
        url.searchParams.set("lang", "tr");
        url.searchParams.set("bundle", "messaging_non_clips");
        url.searchParams.set("remove_low_contrast", "true");

        if (query) {
          if (query.length < 2) {
            setGifResults([]);
            setGifLoading(false);
            return;
          }

          url.searchParams.set("q", query);
        }

        const randomId = await ensureGiphyRandomId(giphyApiKey, giphyRandomIdKey);
        url.searchParams.set("random_id", randomId);

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Giphy aramasi su an yanit vermedi.");
        }

        const payload = (await response.json()) as { data?: unknown[] };
        const nextResults = (payload.data ?? [])
          .map(mapGiphyApiGif)
          .filter((item): item is GiphySearchResult => Boolean(item));

        setGifResults(nextResults);
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") {
          return;
        }

        setGifError("GIF sonuclari su an yuklenemedi.");
      } finally {
        setGifLoading(false);
      }
    }, query ? 550 : 100);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [canUseGiphy, gifOpen, gifQuery, giphyApiKey, giphyRandomIdKey]);

  useEffect(() => {
    if (!gifOpen || !gifResults.length) {
      return;
    }

    for (const gif of gifResults) {
      if (seenGifAnalyticsIdsRef.current.has(gif.id)) {
        continue;
      }

      seenGifAnalyticsIdsRef.current.add(gif.id);
      void sendGiphyPingback(gif.analytics.onload);
    }
  }, [gifOpen, gifResults, sendGiphyPingback]);

  useEffect(() => {
    const effectSetPresence = async (isOnline: boolean) => {
      await supabase.rpc("touch_user_presence", {
        input_room_id: room.id,
        input_is_online: isOnline,
      });
    };

    const effectMarkRead = async () => {
      await supabase.rpc("mark_room_messages_as_read", {
        input_room_id: room.id,
      });
    };

    const effectSetTyping = async (isTyping: boolean) => {
      await supabase.rpc("set_typing_status", {
        input_room_id: room.id,
        input_is_typing: isTyping,
      });
    };

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const row = payload.new as Database["public"]["Tables"]["messages"]["Row"];
          const mapped = mapRealtimeMessage(row);

          mergeMessage(mapped);
          void notifyPartnerMessage(mapped);

          if (!document.hidden) {
            void effectMarkRead();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const row = payload.new as Database["public"]["Tables"]["messages"]["Row"];
          mergeMessage(mapRealtimeMessage(row));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_status",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const row =
            (payload.new as Database["public"]["Tables"]["typing_status"]["Row"]) ??
            (payload.old as Database["public"]["Tables"]["typing_status"]["Row"]);

          if (row.user_id === currentUser.id) {
            return;
          }

          if (partnerIdRef.current && row.user_id !== partnerIdRef.current) {
            return;
          }

          scheduleTypingIndicator(row.is_typing);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: "user_id=not.is.null",
        },
        (payload) => {
          if (!payload.new) {
            return;
          }

          const row = payload.new as Database["public"]["Tables"]["user_presence"]["Row"];
          if (row.user_id === currentUser.id) {
            return;
          }
          if (!partnerIdRef.current || row.user_id !== partnerIdRef.current) {
            return;
          }
          setPartnerPresence({
            userId: row.user_id,
            isOnline: row.is_online,
            activeRoomId: row.active_room_id,
            lastSeenAt: row.last_seen_at,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_room_members",
          filter: `room_id=eq.${room.id}`,
        },
        () => {
          void syncLatestState();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const row = payload.old as Database["public"]["Tables"]["messages"]["Row"];
          setMessages((current) => current.filter((message) => message.id !== row.id));
          setAudioUrls((current) => {
            const next = { ...current };
            delete next[row.id];
            return next;
          });
        },
      );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setSyncState("live");
        void effectSetPresence(true);
        void effectMarkRead();
        void syncLatestState();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setSyncState("polling");
      }
    });

    return () => {
      void effectSetTyping(false);
      void effectSetPresence(false);
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, mergeMessage, notifyPartnerMessage, room.id, supabase, syncLatestState]);

  useEffect(() => {
    const effectSetPresence = async (isOnline: boolean) => {
      await supabase.rpc("touch_user_presence", {
        input_room_id: room.id,
        input_is_online: isOnline,
      });
    };

    const effectMarkRead = async () => {
      await supabase.rpc("mark_room_messages_as_read", {
        input_room_id: room.id,
      });
    };

    const effectSetTyping = async (isTyping: boolean) => {
      await supabase.rpc("set_typing_status", {
        input_room_id: room.id,
        input_is_typing: isTyping,
      });
    };

    const interval = window.setInterval(() => {
      void effectSetPresence(!document.hidden);
    }, PRESENCE_HEARTBEAT_MS);

    const handleVisibility = () => {
      void effectSetPresence(!document.hidden);
      if (!document.hidden) {
        void effectMarkRead();
      }
    };

    const handleBeforeUnload = () => {
      void effectSetTyping(false);
      void effectSetPresence(false);
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [room.id, supabase]);

  useEffect(() => {
    const firstSync = window.setTimeout(() => {
      void syncLatestState();
    }, 0);

    const interval = window.setInterval(() => {
      if (syncState !== "live" || document.hidden) {
        void syncLatestState();
      }
    }, CHAT_SYNC_INTERVAL_MS);

    return () => {
      window.clearTimeout(firstSync);
      window.clearInterval(interval);
    };
  }, [syncLatestState, syncState]);

  useEffect(() => {
    const messagesToResolve = messages.filter((message) => {
      const audioMetadata = getAudioMessageMetadata(message);
      return (
        audioMetadata &&
        !audioUrls[message.id] &&
        !pendingAudioResolveRef.current.has(message.id)
      );
    });

    if (!messagesToResolve.length) {
      return;
    }

    for (const message of messagesToResolve) {
      const audioMetadata = getAudioMessageMetadata(message);

      if (!audioMetadata) {
        continue;
      }

      pendingAudioResolveRef.current.add(message.id);

      void supabase.storage
        .from(audioMetadata.storageBucket)
        .createSignedUrl(audioMetadata.storagePath, AUDIO_SIGNED_URL_TTL_SECONDS)
        .then(({ data, error }) => {
          if (!error && data?.signedUrl) {
            setAudioUrls((current) => ({
              ...current,
              [message.id]: data.signedUrl,
            }));
          }
        })
        .finally(() => {
          pendingAudioResolveRef.current.delete(message.id);
        });
    }
  }, [audioUrls, messages, supabase]);

  async function handleSend() {
    const body = draft.trim();

    if (!body || body.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    setIsSending(true);

    try {
      const gifMetadata = createGifMetadataFromUrl(body);
      const data = await insertMessageRow(body, gifMetadata);

      setDraft("");
      setEmojiOpen(false);
      setGifOpen(false);
      await setTypingStatus(false);

      applyIncomingMessage(mapRealtimeMessage(data));
    } catch (error) {
      queueToast(getActionErrorMessage("Mesaj su an gonderilemedi.", error));
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendGif(gif: GiphySearchResult) {
    setIsSending(true);

    try {
      const data = await insertMessageRow(gif.sourceUrl, {
        type: "gif",
        gifId: gif.id,
        sourceUrl: gif.sourceUrl,
        previewUrl: gif.previewUrl,
        renderUrl: gif.renderUrl,
        width: gif.width,
        height: gif.height,
        title: gif.title,
      });

      void sendGiphyPingback(gif.analytics.onclick);
      void sendGiphyPingback(gif.analytics.onsent);
      setGifOpen(false);
      setGifQuery("");
      setGifResults([]);
      applyIncomingMessage(mapRealtimeMessage(data));
    } catch (error) {
      queueToast(getActionErrorMessage("GIF su an gonderilemedi.", error));
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendAudio() {
    if (!audioDraft) {
      return;
    }

    setIsSending(true);
    let uploadedStoragePath: string | null = null;

    try {
      const extension =
        audioDraft.mimeType.includes("mp4")
          ? "m4a"
          : audioDraft.mimeType.includes("ogg")
            ? "ogg"
            : "webm";
      const storagePath = `${room.id}/${currentUser.id}/${crypto.randomUUID()}.${extension}`;
      uploadedStoragePath = storagePath;

      const uploadResult = await supabase.storage
        .from("chat-audio")
        .upload(storagePath, audioDraft.blob, {
          contentType: audioDraft.mimeType,
        });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const data = await insertMessageRow("Sesli mesaj", {
        type: "audio",
        storageBucket: "chat-audio",
        storagePath,
        durationMs: audioDraft.durationMs,
        mimeType: audioDraft.mimeType,
        fileSize: audioDraft.fileSize,
      });

      clearDraft();
      await setTypingStatus(false);
      applyIncomingMessage(mapRealtimeMessage(data));
    } catch (error) {
      if (uploadedStoragePath) {
        await supabase.storage.from("chat-audio").remove([uploadedStoragePath]);
      }
      queueToast(getActionErrorMessage("Sesli mesaj su an gonderilemedi.", error));
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteMessage(message: MessageSummary) {
    setMessageActionId(message.id);

    try {
      const audioMetadata = getAudioMessageMetadata(message);

      if (audioMetadata) {
        await supabase.storage.from(audioMetadata.storageBucket).remove([audioMetadata.storagePath]);
      }

      let { error } = await supabase.from("messages").delete().eq("id", message.id);

      if (error && isMembershipError(error) && (await recoverRoomMembership())) {
        const retry = await supabase.from("messages").delete().eq("id", message.id);
        error = retry.error;
      }

      if (error) {
        throw error;
      }

      setMessages((current) => current.filter((item) => item.id !== message.id));
    } catch (error) {
      queueToast(getActionErrorMessage("Mesaj silinemedi.", error));
      void syncLatestState();
    } finally {
      setMessageActionId(null);
      if (editingMessageId === message.id) {
        setEditingMessageId(null);
        setEditingDraft("");
      }
    }
  }

  async function handleSaveEdit(messageId: string) {
    const body = editingDraft.trim();

    if (!body || body.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    setMessageActionId(messageId);

    try {
      const gifMetadata = createGifMetadataFromUrl(body);
      let { data, error } = await supabase
        .from("messages")
        .update({ body, metadata: normalizeMessageMetadata(gifMetadata) })
        .eq("id", messageId)
        .select()
        .single();

      if (error && isMembershipError(error) && (await recoverRoomMembership())) {
        const retry = await supabase
          .from("messages")
          .update({ body, metadata: normalizeMessageMetadata(gifMetadata) })
          .eq("id", messageId)
          .select()
          .single();

        data = retry.data;
        error = retry.error;
      }

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Guncellenen mesaj verisi donmedi.");
      }

      applyIncomingMessage(mapRealtimeMessage(data));
      setEditingMessageId(null);
      setEditingDraft("");
    } catch (error) {
      queueToast(getActionErrorMessage("Mesaj duzenlenemedi.", error));
      void syncLatestState();
    } finally {
      setMessageActionId(null);
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    void setTypingStatus(Boolean(value.trim()));

    typingTimeoutRef.current = window.setTimeout(() => {
      void setTypingStatus(false);
    }, TYPING_IDLE_MS);
  }

  function handleEmojiPick(emoji: string) {
    setDraft((current) => `${current}${emoji}`);
    void setTypingStatus(true);
  }

  function handleGifQueryChange(value: string) {
    setGifQuery(value);

    if (!value.trim()) {
      setGifResults([]);
      setGifError(null);
      setGifLoading(false);
    }
  }

  function handleToggleEmoji() {
    setEmojiOpen((current) => !current);
    setGifOpen(false);
  }

  function handleToggleGif() {
    setGifOpen((current) => !current);
    setEmojiOpen(false);
    setGifError(null);
  }

  return (
    <main className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl min-w-0 flex-col overflow-hidden px-3 py-4 sm:px-5 sm:py-6">
      <ChatHeader
        partner={partnerProfile}
        room={room}
        partnerPresence={partnerPresence}
      />

      <div className="relative mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-border bg-white/32 p-3 shadow-soft backdrop-blur-sm dark:bg-white/3 sm:p-4">
        <div className="pointer-events-none absolute inset-x-4 top-4 h-32 rounded-full bg-[radial-gradient(circle,#ffffffa0_0%,transparent_68%)] blur-2xl dark:bg-[radial-gradient(circle,#f09ab822_0%,transparent_68%)]" />

        <div className="chat-scrollbar relative min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-1 pb-4 pt-1">
          {messages.length === 0 ? (
            <EmptyChatState
              roomCode={room.roomCode}
              partnerName={partnerProfile?.displayName}
            />
          ) : (
            <>
              {timeline.map((item) => {
                if (item.type === "day") {
                  return (
                    <div key={item.id} className="flex justify-center py-1">
                      <span className="rounded-full border border-border bg-white/64 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted shadow-soft dark:bg-white/7">
                        {item.label}
                      </span>
                    </div>
                  );
                }

                const isOwn = item.message.senderId === currentUser.id;
                const message = item.message;
                const audioMetadata = getAudioMessageMetadata(message);
                const gifMetadata =
                  getGifMessageMetadata(message.metadata) ??
                  createGifMetadataFromUrl(message.body);
                const audioUrl = audioUrls[item.message.id];
                const isEditing = editingMessageId === message.id;
                const canManage = isOwn && !audioMetadata && !gifMetadata;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex animate-message-pop gap-2",
                      isOwn ? "justify-end" : "justify-start",
                    )}
                  >
                    {!isOwn ? (
                      <div className="shrink-0 self-start pt-1">
                        <Avatar
                          name={partnerProfile?.displayName ?? "Partner"}
                          seed={partnerProfile?.avatarSeed}
                          url={partnerProfile?.avatarUrl}
                          size="sm"
                        />
                      </div>
                    ) : null}

                    <div
                      className={cn(
                        "max-w-[82%] min-w-0 overflow-hidden rounded-[1.45rem] px-4 py-3 shadow-soft sm:max-w-[68%]",
                        "whitespace-pre-wrap break-all text-sm leading-6",
                        isOwn
                          ? "bubble-self rounded-br-md"
                          : "bubble-peer rounded-bl-md",
                      )}
                    >
                      {audioMetadata ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p
                              className={cn(
                                "font-semibold",
                                isOwn ? "text-white" : "text-foreground",
                              )}
                            >
                              Sesli mesaj
                            </p>
                            <span
                              className={cn(
                                "text-xs",
                                isOwn ? "text-white/75" : "text-muted",
                              )}
                            >
                              {formatAudioDuration(audioMetadata.durationMs)}
                            </span>
                          </div>
                          {audioUrl ? (
                            <audio
                              controls
                              src={audioUrl}
                              className="w-full"
                              style={{ width: `${getAudioBubbleWidth(audioMetadata.durationMs)}px`, maxWidth: "100%" }}
                              preload="metadata"
                            />
                          ) : (
                            <div
                              className={cn(
                                "rounded-2xl border px-4 py-3 text-xs",
                                isOwn
                                  ? "border-white/20 text-white/80"
                                  : "border-border text-muted",
                              )}
                            >
                              Ses dosyasi hazirlaniyor...
                            </div>
                          )}
                        </div>
                      ) : gifMetadata ? (
                        <div className="space-y-3">
                          <div
                            className="overflow-hidden rounded-[1.15rem] bg-black/8"
                            style={{
                              width: `${getGifBubbleWidth(
                                gifMetadata.width,
                                gifMetadata.height,
                              )}px`,
                              maxWidth: "100%",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={gifMetadata.renderUrl}
                              alt={gifMetadata.title ?? "GIPHY GIF"}
                              className="h-auto w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <a
                            href={gifMetadata.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "inline-flex text-xs font-medium transition hover:opacity-80",
                              isOwn ? "text-white/85" : "text-accent",
                            )}
                          >
                            GIF&apos;i Giphy&apos;de ac
                          </a>
                          <span
                            className={cn(
                              "block text-[10px] uppercase tracking-[0.18em]",
                              isOwn ? "text-white/65" : "text-muted",
                            )}
                          >
                            Powered by GIPHY
                          </span>
                        </div>
                      ) : isEditing ? (
                        <div className="space-y-3">
                          <textarea
                            value={editingDraft}
                            onChange={(event) => setEditingDraft(event.target.value)}
                            rows={3}
                            className={cn(
                              "w-full resize-none rounded-2xl border px-3 py-2 outline-none",
                              isOwn
                                ? "border-white/20 bg-white/10 text-white placeholder:text-white/55"
                                : "border-border bg-white/70 text-foreground dark:bg-white/8",
                            )}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingDraft("");
                              }}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold",
                                isOwn ? "border-white/20 text-white" : "border-border text-foreground",
                              )}
                            >
                              <X className="h-3.5 w-3.5" />
                              Vazgeç
                            </button>
                            <button
                              type="button"
                              disabled={messageActionId === message.id}
                              onClick={() => void handleSaveEdit(message.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Kaydet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p>{message.body}</p>
                      )}

                      <div
                        className={cn(
                          "mt-2 flex items-center gap-2 text-[11px]",
                          isOwn ? "justify-end text-white/75" : "text-muted",
                        )}
                      >
                        <span>{formatMessageTime(item.message.createdAt)}</span>
                        {isOwn ? (
                          <span className="uppercase tracking-[0.12em]">
                            {getMessageStateLabel(
                              message.status,
                              message.readAt,
                            )}
                          </span>
                        ) : null}
                      </div>

                      {canManage && !isEditing ? (
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingDraft(message.body);
                            }}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                              isOwn ? "border-white/20 text-white" : "border-border text-foreground",
                            )}
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Düzenle
                          </button>
                          <button
                            type="button"
                            disabled={messageActionId === message.id}
                            onClick={() => void handleDeleteMessage(message)}
                            className="inline-flex items-center gap-1 rounded-full border border-danger/30 px-3 py-1.5 text-[11px] font-semibold text-danger disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Sil
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isOwn ? (
                      <div className="shrink-0 self-start pt-1">
                        <Avatar
                          name={currentUser.displayName}
                          seed={currentUser.avatarSeed}
                          url={currentUser.avatarUrl}
                          size="sm"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {showTyping ? (
                <div className="flex justify-start">
                  <TypingIndicator />
                </div>
              ) : null}
            </>
          )}
          <div ref={endRef} />
        </div>

        <div className="pointer-events-none absolute right-4 top-4 z-30 flex max-w-[calc(100%-2rem)] flex-col gap-2 sm:max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-2 rounded-2xl border border-border bg-white/88 px-4 py-3 text-sm shadow-soft backdrop-blur dark:bg-[#201925]/88"
            >
              <BellRing className="h-4 w-4 text-accent" />
              <span>{toast.text}</span>
            </div>
          ))}
        </div>

        {!partnerProfile ? (
          <div className="px-2 pt-3 text-center text-xs uppercase tracking-[0.18em] text-muted">
            Partnerin bağlandığında burada online durumu ve yazıyor bilgisi görünür.
          </div>
        ) : null}

        <div className="mt-4 shrink-0">
          <MessageComposer
            value={draft}
            isSending={isSending}
            disabled={false}
            isEmojiOpen={emojiOpen}
            isGifOpen={gifOpen}
            isRecording={isRecording}
            recordingDurationMs={recordingDurationMs}
            canRecordAudio={canRecordAudio}
            canUseGiphy={canUseGiphy}
            gifQuery={gifQuery}
            gifResults={gifResults}
            gifLoading={gifLoading}
            gifError={gifError}
            audioDraft={
              audioDraft
                ? {
                    url: audioDraft.url,
                    durationMs: audioDraft.durationMs,
                  }
                : null
            }
            audioError={audioError}
            onValueChange={handleDraftChange}
            onStartRecording={() => void startRecording()}
            onStopRecording={stopRecording}
            onClearAudioDraft={clearDraft}
            onSendAudio={() => void handleSendAudio()}
            onToggleEmoji={handleToggleEmoji}
            onToggleGif={handleToggleGif}
            onEmojiPick={handleEmojiPick}
            onGifQueryChange={handleGifQueryChange}
            onGifPick={(gif) => void handleSendGif(gif)}
            onSend={handleSend}
          />
        </div>
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-between px-2 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <Radio className="h-3.5 w-3.5" />
          {syncState === "live"
            ? "Canlı bağlantı aktif"
            : syncState === "polling"
              ? "Canlı bağlantı zayıf, arka planda otomatik senkron çalışıyor"
              : "Bağlantı kuruluyor"}
        </span>
        <button
          type="button"
          onClick={() => void syncLatestState()}
          className="rounded-full border border-border px-3 py-1 transition hover:text-accent"
        >
          <span className="inline-flex items-center gap-1.5">
            <RefreshCcw className="h-3.5 w-3.5" />
            Senkronla
          </span>
        </button>
      </div>
    </main>
  );
}
