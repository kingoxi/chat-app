export {};

declare global {
  interface Window {
    __HEARTLINE_PUBLIC_ENV__?: {
      NEXT_PUBLIC_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
      NEXT_PUBLIC_GIPHY_API_KEY?: string;
    };
  }
}
