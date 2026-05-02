"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function AuthRedirect() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted || !session?.user?.id) {
        return;
      }

      const { data } = await supabase
        .from("chat_room_members")
        .select("room_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      router.replace(data?.room_id ? "/chat" : "/invite");
    }

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  return null;
}
