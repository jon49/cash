(() => {
  // node_modules/idb-keyval/dist/index.js
  function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.oncomplete = request.onsuccess = () => resolve(request.result);
      request.onabort = request.onerror = () => reject(request.error);
    });
  }
  function createStore(dbName, storeName) {
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    const dbp = promisifyRequest(request);
    return (txMode, callback) => dbp.then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
  }
  var defaultGetStoreFunc;
  function defaultGetStore() {
    if (!defaultGetStoreFunc) {
      defaultGetStoreFunc = createStore("keyval-store", "keyval");
    }
    return defaultGetStoreFunc;
  }
  function get(key, customStore = defaultGetStore()) {
    return customStore("readonly", (store2) => promisifyRequest(store2.get(key)));
  }
  function set(key, value, customStore = defaultGetStore()) {
    return customStore("readwrite", (store2) => {
      store2.put(value, key);
      return promisifyRequest(store2.transaction);
    });
  }

  // src/app/sw.ts
  var cacheVersion = "__CACHE_VERSION__";
  var offlinePage = "/web/offline.html";
  var homePage = "/app/transactions/edit/";
  var bypass = ["/api/", "/_/"];
  var alwaysCache = [
    "/app/categories/edit/"
  ];
  var precache = [
    ...alwaysCache,
    homePage,
    offlinePage,
    "/web/css/app.css",
    "/web/css/pico.min.css",
    "/web/js/app.js",
    "/web/js/html-form.min.js",
    "/web/manifest.json",
    "/web/images/cash.svg",
    "/web/images/cash.ico",
    "/web/images/cash.png"
  ];
  var neverQueue = ["/login", "/app/logout/", "/app/export/", "/app/delete-all-data/"];
  var offlineMessage = "You are currently offline. Any changes will be saved and synced when you are back online.";
  var unreachableMessage = "Can't reach the server right now. Showing the last version saved on this device.";
  self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(fillCache());
  });
  self.addEventListener("activate", (e) => {
    e.waitUntil(deleteOldCache().then(() => self.clients.claim()));
  });
  async function fillCache() {
    let cache = await caches.open(cacheVersion);
    let addToCache = async (path, hf) => {
      try {
        let response = await fetch(path, {
          credentials: "same-origin",
          headers: hf ? { "HF-Request": "true" } : void 0
        });
        if (isCacheable(response)) {
          await cache.put(hf ? `/hf${path}` : path, response);
        }
      } catch (_) {
      }
    };
    await Promise.all([
      ...precache.map((path) => addToCache(path, false)),
      // The partials html-form pulls in, e.g. the "Add Category" dialog.
      ...alwaysCache.map((path) => addToCache(path, true))
    ]);
  }
  async function deleteOldCache() {
    let cacheNames = await caches.keys();
    let toDeleteOldCaches = cacheNames.filter((cache) => cache !== cacheVersion).map((cache) => caches.delete(cache));
    return Promise.all(toDeleteOldCaches);
  }
  self.addEventListener(
    "fetch",
    (e) => {
      let request = e.request;
      let url = new URL(request.url);
      if (url.origin !== self.location.origin || bypass.some((prefix) => url.pathname.startsWith(prefix))) {
        return;
      }
      if (request.method === "GET") {
        return e.respondWith(handleGet(e, request, url));
      }
      if (request.method === "POST") {
        return e.respondWith(handlePost(request, url));
      }
    }
  );
  async function handleGet(e, request, url) {
    let key = cacheKey(request, url);
    if (isFile(url) || alwaysCache.includes(url.pathname)) {
      return cacheFirst(e, request, key);
    }
    return networkFirst(e, request, url, key);
  }
  async function cacheFirst(e, request, key) {
    let cached = await caches.match(key);
    if (cached) {
      e.waitUntil(store(request, key).catch(() => {
      }));
      return cached;
    }
    try {
      return await store(request, key);
    } catch (_) {
      return offlineFallback(request, new URL(request.url));
    }
  }
  async function networkFirst(e, request, url, key) {
    let response;
    try {
      response = await fetch(request);
    } catch (_) {
      return cachedOr(key, request, url);
    }
    if (response.status >= 500) {
      return cachedOr(key, request, url);
    }
    if (isCacheable(response)) {
      let clone = response.clone();
      e.waitUntil(
        caches.open(cacheVersion).then((cache) => cache.put(key, clone)).catch(() => {
        })
      );
    }
    return response;
  }
  async function cachedOr(key, request, url) {
    let cached = await caches.match(key);
    if (cached) return cached;
    return offlineFallback(request, url);
  }
  async function store(request, key) {
    let response = await fetch(request);
    if (isCacheable(response)) {
      let cache = await caches.open(cacheVersion);
      await cache.put(key, response.clone());
    }
    return response;
  }
  function isCacheable(response) {
    return !!response && response.status === 200 && response.type === "basic" && !response.redirected;
  }
  async function offlineFallback(request, url) {
    if (request.mode === "navigate") {
      if (url.pathname === "/") {
        let home = await caches.match(homePage);
        if (home) return home;
      }
      let page = await caches.match(offlinePage);
      if (page) return page;
      return new Response(fallbackHtml, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    return messageResponse(unreachableMessage);
  }
  function messageResponse(message) {
    return new Response(null, {
      status: 204,
      headers: { "hf-events": JSON.stringify({ message }) }
    });
  }
  async function handlePost(request, url) {
    if (url.pathname.startsWith("/sw/sync")) {
      return syncPostRequests(request);
    }
    let clonedRequest = request.clone();
    try {
      let response = await fetch(request);
      if (response.status < 500) return response;
    } catch (_) {
    }
    if (neverQueue.includes(url.pathname)) {
      return messageResponse("Can't reach the server right now. Please try again once you are back online.");
    }
    await savePostRequest(clonedRequest);
    await notifyPendingSync();
    return messageResponse(offlineMessage);
  }
  self.addEventListener("message", async (event) => {
    let data = event.data;
    if (!data?.type) return;
    switch (data.type) {
      case "CHECK_SYNC_STATUS":
        let posts = await get("postRequests") ?? [];
        event.ports[0].postMessage({ hasPendingSync: posts.length > 0 });
        break;
      case "CLEAR_CACHE":
        await caches.delete(cacheVersion);
        break;
      default:
        break;
    }
  });
  async function notifyPendingSync() {
    let posts = await get("postRequests") ?? [];
    let clients = await self.clients.matchAll();
    for (let client of clients) {
      client.postMessage({ type: "SYNC_STATUS", hasPendingSync: posts.length > 0 });
    }
  }
  async function savePostRequest(request) {
    let posts = await get("postRequests") ?? [];
    posts.push({
      url: request.url,
      headers: Array.from(request.headers.entries()),
      body: await request.clone().text(),
      method: request.method
    });
    await set("postRequests", posts);
  }
  async function syncPostRequests(req) {
    let posts = await get("postRequests") ?? [];
    let requests = [...posts];
    for (let savedRequest of posts) {
      const headers = new Headers(savedRequest.headers);
      const request = new Request(savedRequest.url, {
        method: savedRequest.method,
        headers,
        body: savedRequest.body
      });
      try {
        let response = await fetch(request);
        if (!response.ok) throw new Error(`Server responded with ${response.status}.`);
        requests = requests.filter((r) => r !== savedRequest);
        await set("postRequests", requests);
      } catch (error) {
        console.error("Failed to sync request", error);
        await notifyPendingSync();
        return new Response("<p>Failed to sync. Please try again once you are back online.</p>", { status: 200, headers: { "Content-Type": "text/html" } });
      }
    }
    await notifyPendingSync();
    return new Response(JSON.stringify({ redirectUrl: req.referrer || homePage }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  }
  function cacheKey(request, url) {
    let params = new URLSearchParams(url.search);
    params.delete("_");
    let search = params.toString();
    let path = `${url.pathname}${search ? `?${search}` : ""}`;
    return request.headers.get("HF-Request") === "true" ? `/hf${path}` : path;
  }
  function isFile(url) {
    return url.pathname.includes(".");
  }
  var fallbackHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Offline $ Cash Tracker</title>
<style>body{font-family:system-ui,sans-serif;margin:0 auto;padding:2em 1em;max-width:35em;line-height:1.5}</style>
</head><body>
<h1>$ Cash Tracker</h1>
<p>The server can't be reached, and this page hasn't been saved on this device yet.</p>
<p><a href="${homePage}">New transaction</a></p>
<p><button onclick="location.reload()">Try again</button></p>
</body></html>`;
})();
