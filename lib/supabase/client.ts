"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;
let fallbackClient:
  | ReturnType<typeof createBrowserClient<Database>>
  | undefined;

function getMissingEnvClient() {
  if (!fallbackClient) {
    const missingEnvError = () => {
      throw new Error(
        "Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment.",
      );
    };

    fallbackClient = new Proxy(
      {},
      {
        get() {
          return new Proxy(missingEnvError, {
            get() {
              return missingEnvError;
            },
            apply() {
              return missingEnvError();
            },
          });
        },
      },
    ) as ReturnType<typeof createBrowserClient<Database>>;
  }

  return fallbackClient;
}

export function createBrowserSupabaseClient() {
  if (typeof window === "undefined") {
    return getMissingEnvClient();
  }

  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      return getMissingEnvClient();
    }

    browserClient = createBrowserClient<Database>(url, key);
  }

  return browserClient;
}
