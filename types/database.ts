export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MessageDeliveryState = "sent" | "delivered" | "read";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_seed: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          avatar_seed?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string;
          avatar_seed?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_rooms: {
        Row: {
          id: string;
          room_code: string;
          created_by: string;
          created_at: string;
          updated_at: string;
          last_message_at: string | null;
        };
        Insert: {
          id?: string;
          room_code?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          last_message_at?: string | null;
        };
        Update: {
          room_code?: string;
          updated_at?: string;
          last_message_at?: string | null;
        };
        Relationships: [];
      };
      chat_room_members: {
        Row: {
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          joined_at?: string;
        };
        Relationships: [];
      };
      room_membership_history: {
        Row: {
          room_id: string;
          user_id: string;
          first_joined_at: string;
          last_joined_at: string;
          last_left_at: string | null;
        };
        Insert: {
          room_id: string;
          user_id: string;
          first_joined_at?: string;
          last_joined_at?: string;
          last_left_at?: string | null;
        };
        Update: {
          first_joined_at?: string;
          last_joined_at?: string;
          last_left_at?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          sender_id: string;
          body: string;
          status: MessageDeliveryState;
          metadata: Json;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          sender_id: string;
          body: string;
          status?: MessageDeliveryState;
          metadata?: Json;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          body?: string;
          status?: MessageDeliveryState;
          metadata?: Json;
          read_at?: string | null;
        };
        Relationships: [];
      };
      typing_status: {
        Row: {
          room_id: string;
          user_id: string;
          is_typing: boolean;
          updated_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          is_typing?: boolean;
          updated_at?: string;
        };
        Update: {
          is_typing?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_presence: {
        Row: {
          user_id: string;
          is_online: boolean;
          active_room_id: string | null;
          last_seen_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          is_online?: boolean;
          active_room_id?: string | null;
          last_seen_at?: string;
          updated_at?: string;
        };
        Update: {
          is_online?: boolean;
          active_room_id?: string | null;
          last_seen_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_private_room: {
        Args: {
          input_room_code?: string | null;
        };
        Returns: string;
      };
      get_saved_rooms: {
        Args: Record<PropertyKey, never>;
        Returns: {
          room_id: string;
          room_code: string;
          last_message_at: string | null;
          last_joined_at: string;
          last_left_at: string | null;
          active_member_count: number;
          active_partner_name: string | null;
        }[];
      };
      is_room_code_available: {
        Args: {
          input_room_code: string;
        };
        Returns: boolean;
      };
      join_room_by_code: {
        Args: {
          input_room_code: string;
        };
        Returns: string;
      };
      get_my_room_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      recover_my_room_membership: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      leave_current_room: {
        Args: {
          input_confirmation: string;
          input_keep_room?: boolean | null;
        };
        Returns: string;
      };
      mark_room_messages_as_read: {
        Args: {
          input_room_id: string;
        };
        Returns: number;
      };
      touch_user_presence: {
        Args: {
          input_room_id?: string | null;
          input_is_online?: boolean | null;
        };
        Returns: null;
      };
      set_typing_status: {
        Args: {
          input_room_id: string;
          input_is_typing: boolean;
        };
        Returns: null;
      };
    };
    Enums: Record<string, never>;
  };
};
