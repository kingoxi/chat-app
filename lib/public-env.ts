export type PublicRuntimeEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_GIPHY_API_KEY?: string;
};

export function readPublicEnvFromProcess(): PublicRuntimeEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GIPHY_API_KEY: process.env.NEXT_PUBLIC_GIPHY_API_KEY,
  };
}

export function readPublicEnv(): PublicRuntimeEnv {
  if (
    typeof window !== "undefined" &&
    window.__HEARTLINE_PUBLIC_ENV__
  ) {
    return window.__HEARTLINE_PUBLIC_ENV__;
  }

  return readPublicEnvFromProcess();
}

export function hasSupabasePublicEnv(env: PublicRuntimeEnv = readPublicEnv()) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
