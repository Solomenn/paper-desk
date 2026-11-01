/* 全站静态资源预加载与持久缓存。
   页面保持可交互；Service Worker 在后台分批下载所有页面、图片、音效和 3D 资源。 */
"use strict";

const CACHE_NAME = "paper-desk-site-v6";
const CACHE_PREFIX = "paper-desk-site-";
const OLD_CACHE_PREFIX = "paper-desk-carriage-";
const FONT_ORIGIN = "https://cdn.jsdelivr.net";
const FONT_PATH_PREFIXES = [
  "/npm/lxgw-wenkai-webfont@1.7.0/files/",
  "/npm/@fontsource/noto-serif-sc@5.3.1/files/",
  "/npm/@fontsource/noto-sans-sc@5.3.1/files/"
];
const STATIC_EXTENSIONS = /\.(?:html|css|js|json|webp|png|jpe?g|svg|avif|hdr|glb|m4a|woff2?|ttf|otf)$/i;
const inFlight = new Map();
let preloadPromise = null;

function inScope(url) {
  const root = new URL(self.registration.scope);
  return url.origin === root.origin && url.pathname.startsWith(root.pathname);
}

function isCacheableRequest(request) {
  if (request.method !== "GET" || request.headers.has("range")) return false;
  const url = new URL(request.url);

  if (inScope(url)) {
    return STATIC_EXTENSIONS.test(url.pathname);
  }

  if (url.origin === FONT_ORIGIN && /\.woff2?$/i.test(url.pathname)) {
    return FONT_PATH_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
  }

  return false;
}

async function fetchAndCache(request) {
  const cache = await caches.open(CACHE_NAME);
  const key = request.url;
  let task = inFlight.get(key);

  if (!task) {
    task = (async () => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.status === 200 && response.type !== "opaque") {
        try {
          await cache.put(request, response.clone());
        } catch (error) {
          console.warn("[paper-desk] cache write failed:", request.url, error);
        }
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

function makeRequest(url) {
  return new Request(url.href, {
    method: "GET",
    credentials: "same-origin",
    cache: "force-cache"
  });
}

async function loadGroup(group, completed, failed) {
  const paths = Array.isArray(group.paths) ? group.paths : [];
  let cursor = 0;
  const concurrency = Math.max(1, Math.min(6, Number(group.concurrency) || 3));

  async function worker() {
    while (cursor < paths.length) {
      const path = paths[cursor++];
      try {
        const url = new URL(path, self.registration.scope);
        const response = await fetchAndCache(makeRequest(url));
        if (!response.ok) throw new Error("HTTP " + response.status);
        if (response.body) await response.body.cancel().catch(() => {});
        completed.push(path);
      } catch (error) {
        failed.push({path, message:String(error && error.message || error)});
      }
    }
  }

  await Promise.all(Array.from({length:Math.min(concurrency, paths.length)}, worker));
}

async function preloadAssets() {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const manifestUrl = new URL("preload-manifest.json", self.registration.scope);
    const manifestResponse = await fetchAndCache(makeRequest(manifestUrl));
    if (!manifestResponse.ok) throw new Error("preload-manifest.json: HTTP " + manifestResponse.status);

    const manifest = await manifestResponse.json();
    const groups = Array.isArray(manifest.groups) ? manifest.groups : [];
    const completed = [];
    const failed = [];
    const total = groups.reduce((sum, group) => sum + (Array.isArray(group.paths) ? group.paths.length : 0), 0);

    for (const group of groups) {
      await loadGroup(group, completed, failed);
    }

    return {completed, failed, total};
  })();

  try {
    return await preloadPromise;
  } finally {
    preloadPromise = null;
  }
}

function navigationKey(request) {
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  let pathname = url.pathname;

  if (pathname === scope.pathname || pathname === scope.pathname.slice(0, -1)) {
    pathname = scope.pathname + "index.html";
  } else if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  return new Request(url.origin + pathname, {credentials:"same-origin"});
}

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name =>
        (name.startsWith(CACHE_PREFIX) || name.startsWith(OLD_CACHE_PREFIX)) &&
        name !== CACHE_NAME
      )
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "PRELOAD_SITE") return;

  event.waitUntil((async () => {
    let result;
    try {
      result = await preloadAssets();
    } catch (error) {
      result = {
        completed:[],
        failed:[{path:"preload-manifest.json",message:String(error && error.message || error)}],
        total:0
      };
    }

    if (event.source) {
      event.source.postMessage({type:"SITE_PRELOAD_DONE", ...result});
    }
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  if (
    request.mode === "navigate" &&
    url.origin === scope.origin &&
    url.pathname.startsWith(scope.pathname)
  ) {
    const cachePromise = caches.open(CACHE_NAME);
    const key = navigationKey(request);
    const refreshPromise = cachePromise.then(cache =>
      fetch(request).then(async response => {
        if (response.status === 200) await cache.put(key, response.clone());
        return response;
      })
    );

    // Use the already-prefetched page immediately; refresh it in the background.
    event.waitUntil(refreshPromise.catch(() => {}));
    event.respondWith(
      cachePromise
        .then(cache => cache.match(key))
        .then(cached => cached || refreshPromise)
        .catch(() => refreshPromise)
    );
    return;
  }

  if (!isCacheableRequest(request)) return;

  event.respondWith(
    fetchAndCache(request).catch(async error => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      throw error;
    })
  );
});
