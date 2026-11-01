/* Global idle-time preloader for the 3D train carriage.
   Loaded by every full page in the site. Downloads once, reuses Cache Storage
   across navigation, and never creates a WebGL context outside focus.html. */
(() => {
  "use strict";
  if (window.__paperDeskCarriagePreload) return;

  const currentScript = document.currentScript;
  const BASE = new URL("./", currentScript && currentScript.src ? currentScript.src : location.href);
  const CACHE_NAME = "paper-desk-carriage-v2";
  const ASSETS = [
    "carriage.js",
    "vendor/three.bundle.min.js",
    "assets/3d/cabin.glb",
    "assets/3d/sky_day.hdr",
    "assets/3d/snow_forest.jpg"
  ];
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const status = { state: "scheduled", total: ASSETS.length, completed: [], failed: [], promise: null };
  window.__paperDeskCarriagePreload = status;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(new URL("sw.js", BASE).href, {
      scope: BASE.pathname,
      updateViaCache: "none"
    }).catch(error => console.warn("[paper-desk] carriage cache worker:", error));
  }

  function shouldSkip() {
    return !!(connection && (connection.saveData ||
      connection.effectiveType === "slow-2g" ||
      connection.effectiveType === "2g"));
  }

  async function cacheAsset(cache, path) {
    const url = new URL(path, BASE);
    try {
      const cached = await cache.match(url.href);
      if (cached) {
        status.completed.push(path);
        return;
      }
      const response = await fetch(url.href, {
        method: "GET", mode: "same-origin", credentials: "same-origin",
        cache: "force-cache", priority: "low"
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      try {
        await cache.put(url.href, response.clone());
      } catch (storageError) {
        await response.arrayBuffer();
        console.info("[paper-desk] browser cache only:", path, storageError);
      }
      status.completed.push(path);
    } catch (error) {
      status.failed.push({ path, message: String(error && error.message || error) });
      console.warn("[paper-desk] carriage preload failed:", path, error);
    }
  }

  async function run() {
    if (status.promise) return status.promise;
    status.state = "loading";
    status.promise = (async () => {
      try {
        if (!("caches" in window)) throw new Error("Cache Storage unavailable");
        const cache = await caches.open(CACHE_NAME);
        await Promise.all([cacheAsset(cache, ASSETS[0]), cacheAsset(cache, ASSETS[1])]);
        await Promise.all([
          cacheAsset(cache, ASSETS[2]),
          cacheAsset(cache, ASSETS[3]),
          cacheAsset(cache, ASSETS[4])
        ]);
        status.state = status.failed.length ? "partial" : "ready";
      } catch (error) {
        status.state = "unavailable";
        console.warn("[paper-desk] carriage preloader:", error);
      }
      return status;
    })();
    return status.promise;
  }

  let scheduled = false;
  function schedule() {
    if (scheduled || status.promise || document.visibilityState === "hidden") return;
    if (shouldSkip()) {
      status.state = "skipped-data-saver";
      return;
    }
    scheduled = true;
    const start = () => {
      scheduled = false;
      if (document.visibilityState !== "hidden" && !status.promise) run();
    };
    if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1800 });
    else setTimeout(start, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedule();
  });
})();
