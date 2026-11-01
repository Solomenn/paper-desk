/* Persistent background cache for the train scene.
   Downloads continue in the service worker even if the user changes pages. */
"use strict";

const CACHE_NAME = "paper-desk-carriage-v4";
const CACHE_PREFIX = "paper-desk-carriage-";
const ASSET_PATHS = [
  "assets/snow-day.webp",
  "carriage.js",
  "vendor/three.bundle.min.js",
  "assets/3d/cabin.glb",
  "assets/3d/sky_day.hdr",
  "assets/3d/snow_forest.jpg"
];
const ASSET_SET = new Set(ASSET_PATHS);
const inFlight = new Map();
let preloadPromise = null;

function isCarriageAsset(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  const root = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(root)) return false;
  return ASSET_SET.has(url.pathname.slice(root.length));
}

async function fetchAndCache(request) {
  const key = new URL(request.url).href;
  let task = inFlight.get(key);
  if (!task) {
    task = (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type !== "opaque") {
        try { await cache.put(request, response.clone()); }
        catch (error) { console.warn("[paper-desk] carriage cache write failed:", error); }
      }
      return response;
    })();
    inFlight.set(key, task);
    task.then(
      () => { if (inFlight.get(key) === task) inFlight.delete(key); },
      () => { if (inFlight.get(key) === task) inFlight.delete(key); }
    );
  }
  const response = await task;
  return response.clone();
}

async function preloadAssets() {
  if (preloadPromise) return preloadPromise;
  preloadPromise = (async () => {
    const completed = [];
    const failed = [];
    const load = async path => {
      const url = new URL(path, self.registration.scope);
      try {
        const response = await fetchAndCache(new Request(url.href, {
          method: "GET", credentials: "same-origin", cache: "force-cache"
        }));
        if (!response.ok) throw new Error("HTTP " + response.status);
        if (response.body) await response.body.cancel();
        completed.push(path);
      } catch (error) {
        failed.push({ path, message: String(error && error.message || error) });
      }
    };

    await Promise.all([load(ASSET_PATHS[0]), load(ASSET_PATHS[1])]);
    await Promise.all(ASSET_PATHS.slice(2).map(load));
    return { completed, failed };
  })();

  try {
    return await preloadPromise;
  } finally {
    preloadPromise = null;
  }
}

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "PRELOAD_CARRIAGE") return;
  event.waitUntil((async () => {
    const result = await preloadAssets();
    if (event.source) {
      event.source.postMessage({ type: "CARRIAGE_PRELOAD_DONE", ...result });
    }
  })());
});

self.addEventListener("fetch", event => {
  if (!isCarriageAsset(event.request)) return;
  event.respondWith(fetchAndCache(event.request));
});
