const CACHE_VERSION = "basa-buddy-v2";
const APP_CACHE = `${CACHE_VERSION}-app`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const AUDIO_MANIFEST_URL = "/audio-manifest.json";
const APP_SHELL = [
  "/",
  "/child",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  AUDIO_MANIFEST_URL,
];

async function precacheAssessmentAudio() {
  try {
    const manifestResponse = await fetch(AUDIO_MANIFEST_URL, { cache: "reload" });
    if (!manifestResponse.ok) return;
    const urls = await manifestResponse.json();
    if (!Array.isArray(urls)) return;

    const cache = await caches.open(ASSET_CACHE);
    await Promise.allSettled(
      urls
        .filter((url) => typeof url === "string" && url.startsWith("/audio/"))
        .map((url) => cache.add(new Request(url, { cache: "reload" }))),
    );
  } catch {
    // Audio remains cache-first on demand if a manifest fetch is unavailable.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.allSettled([
      caches.open(APP_CACHE).then((cache) =>
        Promise.allSettled(
          APP_SHELL.map((url) => cache.add(new Request(url, { cache: "reload" }))),
        ),
      ),
      precacheAssessmentAudio(),
    ]),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== APP_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("/"));
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset =
    url.pathname.startsWith("/audio/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/");

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});
