/* Persistent cache for the train scene. Scope is the GitHub Pages project path. */
"use strict";
const CACHE_NAME = "paper-desk-carriage-v2";
const CACHE_PREFIX = "paper-desk-carriage-";
const ASSET_PATHS = new Set([
  "carriage.js", "vendor/three.bundle.min.js", "assets/3d/cabin.glb",
  "assets/3d/sky_day.hdr", "assets/3d/snow_forest.jpg"
]);
function isCarriageAsset(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  const root = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(root)) return false;
  return ASSET_PATHS.has(url.pathname.slice(root.length));
}
self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  if (!isCarriageAsset(event.request)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && response.type !== "opaque") {
      try { await cache.put(event.request, response.clone()); }
      catch (error) { console.warn("[paper-desk] could not persist carriage asset:", error); }
    }
    return response;
  })());
});
