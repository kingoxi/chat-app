const CACHE_NAME = "heartline-shell-v2";
const APP_SHELL = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/offline",
  "/manifest.webmanifest",
  "/pwa-192.svg",
  "/pwa-512.svg",
  "/pwa-maskable-512.svg",
];
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/offline",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" }))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    const shouldCacheNavigation = PUBLIC_ROUTES.has(url.pathname);

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (shouldCacheNavigation && response.ok) {
            const responseClone = response.clone();
            void caches.open(CACHE_NAME).then((cache) => {
              void cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(async () => {
          if (shouldCacheNavigation) {
            const cachedPage = await caches.match(request);

            if (cachedPage) {
              return cachedPage;
            }
          }

          return caches.match("/offline");
        }),
    );

    return;
  }

  const isStaticAsset =
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".woff2");

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            void caches.open(CACHE_NAME).then((cache) => {
              void cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse ?? networkFetch;
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Heartline Chat", {
      body: payload.body ?? "Yeni mesajin var.",
      icon: "/pwa-192.svg",
      badge: "/pwa-192.svg",
      data: payload.data ?? { url: "/chat" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/chat";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        for (const client of clientsArr) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
