import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { readPublicEnvFromProcess } from "@/lib/public-env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heartline Chat",
  description: "Private, elegant and mobile-friendly chat space for two.",
  applicationName: "Heartline Chat",
  metadataBase: new URL("https://heartline.local"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Heartline Chat",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b24d74" },
    { media: "(prefers-color-scheme: dark)", color: "#17111b" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publicEnv = readPublicEnvFromProcess();

  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__HEARTLINE_PUBLIC_ENV__ = ${JSON.stringify(publicEnv)};`,
          }}
        />
        <AppProviders>
          <div className="relative min-h-screen overflow-x-hidden">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
              <div
                className="ornament left-[8%] top-10 h-56 w-56 opacity-80"
                style={{ background: "var(--ornament-a)" }}
              />
              <div
                className="ornament right-[-3rem] top-[18%] h-72 w-72 opacity-75"
                style={{ background: "var(--ornament-b)" }}
              />
              <div
                className="ornament bottom-[-5rem] left-[22%] h-80 w-80 opacity-70"
                style={{ background: "var(--ornament-c)" }}
              />
            </div>
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
