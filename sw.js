/* 全站静态资源预加载与持久缓存。
   页面保持可交互；Service Worker 在后台分批下载所有页面、图片、音效和 3D 资源。 */
"use strict";

// 缓存名：发布时 .github/workflows/pages.yml 把 "dev" 换成这次提交的编号（如 paper-desk-site-3f2a9c1）。
// 每次发布 sw.js 都不一样 → 浏览器装上新的 Service Worker → activate 时删掉旧缓存 → 改过的模型、图片重新下载。
// 以前这里写死 v7，改了模型没人改它，访问过的浏览器就一直用缓存里的旧模型（用户 2026-11-02：木柜还是深棕色）。
const CACHE_NAME = "paper-desk-site-dev";
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
    cache: "no-cache"   // 先问服务器文件变了没有：没变只回 304，用本地的；变了才下载。原来是 force-cache，浏览器缓存里有旧文件就直接拿旧的
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

/* 取文件（用户 2026-11-02：浏览器刷新总是刷不到新提交，要根治）：
   站内的所有文件（页面、脚本、图片、模型、音效）一律"先问网络、断网才用缓存"，而且问网络时带 no-cache：
   · no-cache = 浏览器自己的 HTTP 缓存里有也不直接用，先拿 ETag 去问服务器文件变了没有
     （GitHub Pages 每个文件都给 max-age=600，不带 no-cache 的话，发布后 10 分钟内刷新拿到的还是旧的）；
   · 没变：服务器回 304，只有几百字节，模型这种大文件不会重新下载；变了：下载新的，顺手存进缓存；
   · 断网（fetch 失败）：用缓存里存的那份。
   以前模型、音效是"缓存优先、永不过期"，改了模型（木柜刷漆、火车上色）浏览器还一直用旧的。
   例：改了 locomotive.glb 并发布 → 刷新入口页 → 问服务器 → ETag 变了 → 下载新模型 → 看到新颜色。
   站外只有 jsDelivr 上带版本号的字体（地址里写死版本，内容永远不变），仍然缓存优先。 */
const fresh = request => request.mode === "navigate"
  ? new Request(request.url, { cache: "no-cache", credentials: "same-origin" })   // 页面跳转的请求不能直接改 cache，照地址另建一个
  : new Request(request, { cache: "no-cache" });

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  const isPage = request.mode === "navigate" && inScope(url);
  if (!isPage && !isCacheableRequest(request)) return;

  if (!isPage && !inScope(url)) {                                          // jsDelivr 字体：缓存优先
    event.respondWith(fetchAndCache(request));
    return;
  }

  const key = isPage ? navigationKey(request) : request;                   // 页面按"路径 + index.html"存，不带 ?at= 这些参数
  event.respondWith(caches.open(CACHE_NAME).then(cache => fetch(fresh(request)).then(response => {
    if (response.status === 200 && response.type !== "opaque") cache.put(key, response.clone()).catch(() => {});
    return response;
  }).catch(() => cache.match(key).then(c => c || Promise.reject(new Error("offline"))))));
});
