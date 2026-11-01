/* 全站后台预加载：用户浏览当前页面时，提前准备其他页面和全部静态资源。 */
(() => {
  "use strict";
  if (window.__paperDeskPreload) return;

  const currentScript = document.currentScript;
  const BASE = new URL("./", currentScript && currentScript.src ? currentScript.src : location.href);
  const CACHE_NAME = "paper-desk-site-v5";
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const status = {
    state:"scheduled",
    total:0,
    completed:[],
    failed:[],
    decodedImages:0,
    fontsLoaded:0,
    audioDecoded:0,
    warmFailures:0,
    warmed:false
  };

  window.__paperDeskPreload = status;
  // Keep the old property as an alias for any diagnostics that already read it.
  window.__paperDeskCarriagePreload = status;

  let manifest = null;
  let scheduled = false;
  let warming = false;
  let registration = null;
  let registrationPromise = null;
  let lastWorker = null;

  function requestWorkerPreload() {
    const worker = navigator.serviceWorker.controller || (registration && registration.active);
    if (!worker || worker.state !== "activated" || worker === lastWorker) return false;
    lastWorker = worker;
    status.state = "loading";
    worker.postMessage({type:"PRELOAD_SITE"});
    return true;
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    registrationPromise = navigator.serviceWorker.register(new URL("sw.js", BASE).href, {
      scope:BASE.pathname,
      updateViaCache:"none"
    }).then(() => navigator.serviceWorker.ready).then(ready => {
      registration = ready;
      return ready;
    }).catch(error => {
      console.warn("[paper-desk] Service Worker registration failed:", error);
      return null;
    });

    navigator.serviceWorker.addEventListener("controllerchange", requestWorkerPreload);
    navigator.serviceWorker.addEventListener("message", event => {
      const data = event.data;
      if (!data || data.type !== "SITE_PRELOAD_DONE") return;
      status.completed = data.completed || [];
      status.failed = data.failed || [];
      status.total = data.total || status.total;
      status.state = "downloaded";
      warmAfterDownload();
    });
  }

  function shouldSkip() {
    return !!(connection && (
      connection.saveData ||
      connection.effectiveType === "slow-2g" ||
      connection.effectiveType === "2g"
    ));
  }

  async function loadManifest() {
    const url = new URL("preload-manifest.json", BASE);
    const response = await fetch(url.href, {cache:"force-cache"});
    if (!response.ok) throw new Error("preload-manifest.json: HTTP " + response.status);
    return response.json();
  }

  async function fallbackPreload(data) {
    if (!("caches" in window)) throw new Error("Cache Storage is unavailable");
    const cache = await caches.open(CACHE_NAME);
    const completed = [];
    const failed = [];

    for (const group of data.groups || []) {
      const paths = Array.isArray(group.paths) ? group.paths : [];
      let cursor = 0;
      const concurrency = Math.max(1, Math.min(6, Number(group.concurrency) || 3));

      async function worker() {
        while (cursor < paths.length) {
          const path = paths[cursor++];
          const url = new URL(path, BASE);
          try {
            const response = await fetch(url.href, {
              mode:"same-origin",
              credentials:"same-origin",
              cache:"force-cache"
            });
            if (!response.ok) throw new Error("HTTP " + response.status);
            try {
              await cache.put(url.href, response.clone());
            } catch (error) {
              await response.arrayBuffer();
            }
            completed.push(path);
          } catch (error) {
            failed.push({path, message:String(error && error.message || error)});
          }
        }
      }

      await Promise.all(Array.from({length:Math.min(concurrency, paths.length)}, worker));
    }

    return {completed, failed};
  }

  async function warmImages(data) {
    const paths = data.decodeImages || [];
    const images = await Promise.all(paths.map(async path => {
      const image = new Image();
      image.decoding = "async";
      image.src = new URL(path, BASE).href;
      try {
        await image.decode();
        return image;
      } catch (_) {
        return null;
      }
    }));

    const ready = images.filter(Boolean);
    status.imageRefs = ready;
    return ready.length;
  }

  function extractPageText(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script,style,noscript,template").forEach(node => node.remove());
    return doc.body ? (doc.body.textContent || "") : "";
  }

  async function warmFonts(data) {
    if (!document.fonts || typeof document.fonts.load !== "function") return 0;

    const pages = data.fontPages || data.pages || [];
    const texts = await Promise.all(pages.map(async path => {
      try {
        const response = await fetch(new URL(path, BASE).href, {cache:"force-cache"});
        if (!response.ok) return "";
        return extractPageText(await response.text());
      } catch (_) {
        return "";
      }
    }));

    const glyphs = Array.from(new Set(texts.join(" ").replace(/\s+/g, ""))).join("");
    if (!glyphs) return 0;

    const faces = data.fontFaces || [];
    const results = await Promise.allSettled(faces.map(face => document.fonts.load(face, glyphs)));
    return results.reduce((count, result) => {
      return count + (result.status === "fulfilled" ? result.value.length : 0);
    }, 0);
  }

  async function warmAfterDownload() {
    if (warming || status.warmed || document.visibilityState === "hidden" || !manifest) return;
    warming = true;
    status.state = "warming";

    const tasks = [
      warmImages(manifest),
      warmFonts(manifest),
      window.Sound && typeof window.Sound.preload === "function"
        ? window.Sound.preload()
        : Promise.resolve(0)
    ];
    const results = await Promise.allSettled(tasks);

    status.decodedImages = results[0].status === "fulfilled" ? results[0].value : 0;
    status.fontsLoaded = results[1].status === "fulfilled" ? results[1].value : 0;
    status.audioDecoded = results[2].status === "fulfilled" ? results[2].value : 0;
    status.warmFailures = results.filter(result => result.status === "rejected").length;
    status.warmed = true;
    status.state = status.failed.length || status.warmFailures ? "partial" : "ready";
    warming = false;
  }

  async function startPreload() {
    if (document.visibilityState === "hidden") return;
    status.state = "starting";

    try {
      manifest = await loadManifest();
      status.total = (manifest.groups || []).reduce((sum, group) => {
        return sum + (Array.isArray(group.paths) ? group.paths.length : 0);
      }, 0);

      if (registrationPromise) {
        registration = await registrationPromise;
        if (!requestWorkerPreload()) throw new Error("Service Worker is not active");
        return;
      }

      const result = await fallbackPreload(manifest);
      status.completed = result.completed;
      status.failed = result.failed;
      status.state = "downloaded";
      await warmAfterDownload();
    } catch (error) {
      console.warn("[paper-desk] background preload fallback:", error);
      try {
        if (!manifest) manifest = await loadManifest();
        const result = await fallbackPreload(manifest);
        status.completed = result.completed;
        status.failed = result.failed;
        status.state = "downloaded";
        await warmAfterDownload();
      } catch (fallbackError) {
        status.state = "unavailable";
        console.warn("[paper-desk] site preload unavailable:", fallbackError);
      }
    }
  }

  function schedule() {
    if (
      scheduled ||
      status.state === "starting" ||
      status.state === "loading" ||
      status.state === "warming" ||
      status.state === "ready" ||
      document.visibilityState === "hidden"
    ) return;

    if (shouldSkip()) {
      status.state = "skipped-data-saver";
      return;
    }

    if (status.state === "partial") status.warmed = false;
    scheduled = true;
    const start = () => {
      scheduled = false;
      startPreload();
    };

    if ("requestIdleCallback" in window) requestIdleCallback(start, {timeout:1200});
    else setTimeout(start, 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, {once:true});
  } else {
    schedule();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (status.state === "downloaded") warmAfterDownload();
    else schedule();
  });

  if (connection && typeof connection.addEventListener === "function") {
    connection.addEventListener("change", schedule);
  }
})();
