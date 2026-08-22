import { get, set } from "idb-keyval"

// tasks/build.sh replaces the token below with the build timestamp so that every
// deploy gets a fresh cache.
let cacheVersion = "__CACHE_VERSION__"

let offlinePage = "/web/offline.html"
let homePage = "/app/transactions/edit/"

// PocketBase's own API and admin UI have to talk to the server. There is nothing
// useful we could serve them from a cache, so they never touch the worker.
let bypass = ["/api/", "/_/"]

// Small, rarely changing pages which are pulled in as partials all the time.
let alwaysCache = [
    "/app/categories/edit/",
]

// Everything needed to render the app with the server unreachable.
let precache = [
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
    "/web/images/cash.png",
]

// POSTs which only make sense against a live server. Replaying them later would
// either do nothing or do something surprising.
let neverQueue = ["/login", "/app/logout/", "/app/export/", "/app/delete-all-data/"]

let offlineMessage = "You are currently offline. Any changes will be saved and synced when you are back online."
let unreachableMessage = "Can't reach the server right now. Showing the last version saved on this device."

self.addEventListener("install", (e: ExtendableEvent) => {
    self.skipWaiting()
    e.waitUntil(fillCache())
})

self.addEventListener("activate", (e: ExtendableEvent) => {
    e.waitUntil(deleteOldCache().then(() => self.clients.claim()))
})

async function fillCache() {
    let cache = await caches.open(cacheVersion)
    // One at a time rather than cache.addAll so a single missing file can't stop
    // the whole worker from installing.
    let addToCache = async (path: string, hf: boolean) => {
        try {
            let response = await fetch(path, {
                credentials: "same-origin",
                headers: hf ? { "HF-Request": "true" } : void 0,
            })
            if (isCacheable(response)) {
                await cache.put(hf ? `/hf${path}` : path, response)
            }
        } catch (_) { }
    }
    await Promise.all([
        ...precache.map(path => addToCache(path, false)),
        // The partials html-form pulls in, e.g. the "Add Category" dialog.
        ...alwaysCache.map(path => addToCache(path, true)),
    ])
}

async function deleteOldCache() {
    let cacheNames = await caches.keys()
    let toDeleteOldCaches =
        cacheNames
            .filter(cache => cache !== cacheVersion)
            .map(cache => caches.delete(cache))
    return Promise.all(toDeleteOldCaches)
}

self.addEventListener("fetch",
    (e: FetchEvent) => {
        let request = e.request
        let url = new URL(request.url)

        if (url.origin !== self.location.origin
            || bypass.some(prefix => url.pathname.startsWith(prefix))) {
            return
        }

        if (request.method === "GET") {
            return e.respondWith(handleGet(e, request, url))
        }

        if (request.method === "POST") {
            return e.respondWith(handlePost(request, url))
        }
    })

async function handleGet(e: FetchEvent, request: Request, url: URL) {
    let key = cacheKey(request, url)

    if (isFile(url) || alwaysCache.includes(url.pathname)) {
        return cacheFirst(e, request, key)
    }

    return networkFirst(e, request, url, key)
}

// Static files and partials: answer from the cache immediately, then quietly
// refresh it so the next load picks up a new deploy.
async function cacheFirst(e: FetchEvent, request: Request, key: string) {
    let cached = await caches.match(key)
    if (cached) {
        e.waitUntil(store(request, key).catch(() => { }))
        return cached
    }

    try {
        return await store(request, key)
    } catch (_) {
        return offlineFallback(request, new URL(request.url))
    }
}

// Pages: the server is the source of truth, the cache is the safety net.
async function networkFirst(e: FetchEvent, request: Request, url: URL, key: string) {
    let response: Response
    try {
        response = await fetch(request)
    } catch (_) {
        return cachedOr(key, request, url)
    }

    // The server answered but is broken (down for maintenance, a proxy with
    // nothing behind it, ...). That is no more useful to us than being offline.
    if (response.status >= 500) {
        return cachedOr(key, request, url)
    }

    if (isCacheable(response)) {
        let clone = response.clone()
        e.waitUntil(
            caches.open(cacheVersion)
                .then(cache => cache.put(key, clone))
                .catch(() => { }))
    }

    return response
}

async function cachedOr(key: string, request: Request, url: URL) {
    let cached = await caches.match(key)
    if (cached) return cached
    return offlineFallback(request, url)
}

async function store(request: Request, key: string) {
    let response = await fetch(request)
    if (isCacheable(response)) {
        let cache = await caches.open(cacheVersion)
        await cache.put(key, response.clone())
    }
    return response
}

// A redirected response can't be replayed against a navigation, and anything
// but a plain 200 from our own server isn't worth keeping.
function isCacheable(response: Response | undefined) {
    return !!response
        && response.status === 200
        && response.type === "basic"
        && !response.redirected
}

// The last resort: whatever we can still show without a server.
async function offlineFallback(request: Request, url: URL) {
    if (request.mode === "navigate") {
        // "/" is only ever a redirect to the new transaction page, so go
        // straight there instead of showing an error.
        if (url.pathname === "/") {
            let home = await caches.match(homePage)
            if (home) return home
        }

        let page = await caches.match(offlinePage)
        if (page) return page

        return new Response(fallbackHtml, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
        })
    }

    return messageResponse(unreachableMessage)
}

function messageResponse(message: string) {
    return new Response(null, {
        status: 204,
        headers: { "hf-events": JSON.stringify({ message }) },
    })
}

async function handlePost(request: Request, url: URL) {
    if (url.pathname.startsWith("/sw/sync")) {
        return syncPostRequests(request)
    }

    let clonedRequest = request.clone()

    try {
        let response = await fetch(request)
        if (response.status < 500) return response
    } catch (_) { }

    if (neverQueue.includes(url.pathname)) {
        return messageResponse("Can't reach the server right now. Please try again once you are back online.")
    }

    // Save the request for later.
    await savePostRequest(clonedRequest)
    await notifyPendingSync()
    return messageResponse(offlineMessage)
}

self.addEventListener("message", async (event) => {
    let data = event.data
    if (!data?.type) return
    switch (data.type) {
        case "CHECK_SYNC_STATUS":
            let posts = await get("postRequests") ?? []
            event.ports[0].postMessage({ hasPendingSync: posts.length > 0 })
            break
        case "CLEAR_CACHE":
            await caches.delete(cacheVersion)
            break
        default:
            break
    }
})

async function notifyPendingSync() {
    let posts = await get("postRequests") ?? []
    let clients = await self.clients.matchAll()
    for (let client of clients) {
        client.postMessage({ type: "SYNC_STATUS", hasPendingSync: posts.length > 0 })
    }
}

async function savePostRequest(request: Request) {
    let posts = await get("postRequests") ?? []
    posts.push({
        url: request.url,
        headers: Array.from(request.headers.entries()),
        body: await request.clone().text(),
        method: request.method,
    })
    await set("postRequests", posts)
}

async function syncPostRequests(req: Request) {
    let posts = await get("postRequests") ?? []

    let requests = [...posts]
    for (let savedRequest of posts) {
        const headers = new Headers(savedRequest.headers)
        const request = new Request(savedRequest.url, {
            method: savedRequest.method,
            headers: headers,
            body: savedRequest.body,
        })

        try {
            let response = await fetch(request)
            // Only drop it once the server has actually taken it.
            if (!response.ok) throw new Error(`Server responded with ${response.status}.`)
            requests = requests.filter(r => r !== savedRequest)
            await set("postRequests", requests)
        } catch (error) {
            console.error("Failed to sync request", error)
            await notifyPendingSync()
            return new Response("<p>Failed to sync. Please try again once you are back online.</p>", { status: 200, headers: { "Content-Type": "text/html" } })
        }
    }

    await notifyPendingSync()
    return new Response(JSON.stringify({ redirectUrl: req.referrer || homePage }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
    })
}

// Cache keys are paths, not requests: the build stamps static files with a
// "?_=<hash>" cache buster which would otherwise make every deploy a cache miss
// for files we already have. Partials asked for by html-form get their own
// namespace so they can't be handed back to a full page load.
function cacheKey(request: Request, url: URL) {
    let params = new URLSearchParams(url.search)
    params.delete("_")
    let search = params.toString()
    let path = `${url.pathname}${search ? `?${search}` : ""}`
    return request.headers.get("HF-Request") === "true" ? `/hf${path}` : path
}

function isFile(url: URL) {
    return url.pathname.includes(".")
}

// Used only when even the offline page didn't make it into the cache.
let fallbackHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Offline $ Cash Tracker</title>
<style>body{font-family:system-ui,sans-serif;margin:0 auto;padding:2em 1em;max-width:35em;line-height:1.5}</style>
</head><body>
<h1>$ Cash Tracker</h1>
<p>The server can't be reached, and this page hasn't been saved on this device yet.</p>
<p><a href="${homePage}">New transaction</a></p>
<p><button onclick="location.reload()">Try again</button></p>
</body></html>`
