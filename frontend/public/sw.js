const CACHE_NAME = "amana-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

const API_CACHE_NAME = "amana-api-cache-v1";
const API_CACHE_TTL_MS = 5 * 60 * 1000;

const STATIC_ASSET_PATTERN = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|otf|webp|avif)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests; let the browser handle everything else.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache streaming/video/audio or range requests.
  if (request.headers.has("range")) return;
  const destination = request.destination;
  if (destination === "video" || destination === "audio") return;

  // App data routes: network-first with cache fallback.
  if (url.origin === self.location.origin &&
      (url.pathname.startsWith("/api/") || url.pathname.startsWith("/trades/"))) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if (url.origin === self.location.origin &&
      (url.pathname.startsWith("/_next/") || STATIC_ASSET_PATTERN.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Non-essential / cross-origin requests (analytics, third-party fonts,
  // external images) bypass the SW cache and go straight to the network.
});

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached || new Response("Offline", { status: 503 }));
  return cached || network;
}

async function networkFirstWithCache(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      const cloned = response.clone();
      const body = await cloned.text();
      cache.put(request, new Response(body, {
        headers: {
          ...Object.fromEntries(cloned.headers.entries()),
          "x-amana-cache-time": String(Date.now()),
        },
      }));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const cacheTime = cached.headers.get("x-amana-cache-time");
      if (cacheTime && Date.now() - parseInt(cacheTime) < API_CACHE_TTL_MS) {
        return cached;
      }
    }
    return new Response(JSON.stringify({ offline: true, error: "You are offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
