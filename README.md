# Heartline Chat

Private, modern and mobile-first two-person chat app built with Next.js App Router, TypeScript, Tailwind CSS v4 and Supabase.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Database + RLS
- Supabase Realtime
- PWA-ready manifest and service worker scaffold

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.local.example` and fill the Supabase values before starting.

## Mobile Testing

For mobile browser testing on the same Wi-Fi network:

```bash
npm run dev:mobile
```

Open the app from your computer's local IP on your phone.

Important:
- Full PWA install and service worker features require a secure context.
- `localhost` is secure on the same machine, but `http://<LAN-IP>:3000` on a phone is not.
- For real phone install testing, use an HTTPS deployment or a secure tunnel.
