/* Global idle-time preloader for the 3D train carriage.
   Loaded by every full page in the site. The service worker performs downloads
   independently of page navigation, then keeps the files in Cache Storage. */
(() => {
  "use strict";
  if (window.__paperDeskCarriagePreload) return;

  const currentScript = document.currentScript;
  const BASE = new URL("./", currentScript && currentScript.src ? currentScript.src : location.href);
  const CACHE_NAME = "paper-desk-carriage-v3";
  const ASSETS = [
    "carriage.js",
    "vendor/three.bundle.min.js",
    "assets/3d/cabin.glb",
    "assets/3d/sky_day.hdr",
    "assets/3d/snow_forest.jpg"
  ];
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const status = { state: "scheduled", total: ASSETS.length, completed: [], failed: [] };
  window.__paperDeskCarriagePreload = status;

  let registrationPromise = null;
  if ("serviceWorker" in navigator) {
    registrationPromise = navigator.serviceWorker.register(new URL("sw.js", BASE).href, {
      scope: BASE.pathname,
      updateViaCache: "none"
    }).then(() => navigator.serviceWorker.ready);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", event => {
      const data = event.data;
      if (!data || data.type !== "CARRIAGE_PRELOAD_DONE") return;
      status.completed = data.completed || [];
      status.failed = data.failed || [];
      status.state = status.failed.length ? "partial" : "ready";
    });
  }

  function shouldSkip() {
    return !!(connection && (connection.saveData ||
      connection.effectiveType === "slow-2g" ||
      connection.effectiveType === "2g"));
  }

  async function fallbackPreload() {
    if (!("caches" in window)) {
      status.state = "unavailable";
      return;
    }
    status.state = "loading";
    const cache = await caches.open(CACHE_NAME);
    const load = async path => {
      const url = new URL(path, BASE);
      try {
        if (await cache.match(url.href)) {
          status.completed.push(path);
          return;
        }
        const response = await fetch(url.href, {
          mode: "same-origin", credentials: "same-origin",
          cache: "force-cache", priority: "low"
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        try { await cache.put(url.href, response.clone()); }
        catch (error) { await response.arrayBuffer(); }
        status.completed.push(path);
      } catch (error) {
        status.failed.push({ path, message: String(error && error.message || error) });
      }
    };
    await Promise.all([load(ASSETS[0]), load(ASSETS[1])]);
    await Promise.all(ASSETS.slice(2).map(load));
    status.state = status.failed.length ? "partial" : "ready";
  }

  let scheduled = false;
  function schedule() {
    if (scheduled || status.state === "loading" || status.state === "ready" ||
        document.visibilityState === "hidden") return;
    if (shouldSkip()) {
      status.state = "skipped-data-saver";
      return;
    }
    scheduled = true;
    const start = async () => {
      scheduled = false;
      if (document.visibilityState === "hidden") return;
      status.state = "starting";
      try {
        if (registrationPromise) {
          const registration = await registrationPromise;
          const worker = registration.active;
          if (!worker) throw new Error("Service worker is not active yet");
          worker.postMessage({ type: "PRELOAD_CARRIAGE" });
          status.state = "loading";
        } else {
          await fallbackPreload();
        }
      } catch (error) {
        console.warn("[paper-desk] background preload worker unavailable; using page fallback:", error);
        try { await fallbackPreload(); }
        catch (fallbackError) {
          status.state = "unavailable";
          console.warn("[paper-desk] carriage preload:", fallbackError);
        }
      }
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
