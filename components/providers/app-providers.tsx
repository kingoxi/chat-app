"use client";

import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { PwaProvider } from "@/components/providers/pwa-provider";
import { ServiceWorkerBridge } from "@/components/providers/service-worker-bridge";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { InstallBanner } from "@/components/pwa/install-banner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PwaProvider>
        <PreferencesProvider>
          <ServiceWorkerBridge />
          {children}
          <InstallBanner />
        </PreferencesProvider>
      </PwaProvider>
    </ThemeProvider>
  );
}
