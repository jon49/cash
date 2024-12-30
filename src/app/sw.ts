import { get, set } from "idb-keyval"

let cacheVersion = "v2"

let pathsToCache = [
    "/app/transactions/edit/",
    "/app/categories/edit/",
]

self.addEventListener("install", (e) => {
    return e.waitUntil(
        caches.open(cacheVersion).then((cache) => {
            return cache.addAll(pathsToCache)
        })
    )
})

self.addEventListener("activate",
    async (e: ExtendableEvent) => {
        let cacheNames = await caches.keys()
        let toDeleteOldCaches =
            cacheNames
                .filter(cache => cache !== cacheVersion)
                .map(cache => caches.delete(cache))
        return e.waitUntil(Promise.all(toDeleteOldCaches))
    })

self.addEventListener("fetch",
    async (e: FetchEvent) => {
        if (e.request.method === "GET") {
            let url = new URL(e.request.url)
            // Cache all file and specific paths
            if (isFile(url) || pathsToCache.some(path => e.request.url.includes(path))) {
                let isHFRequest = e.request.headers.get("HF-Request") === "true"
                let hfUrl = ""
                if (isHFRequest) {
                    hfUrl = `/hf${url.pathname}${url.search}`
                }
                let pathname = `${url.pathname}${url.search}`

                e.respondWith(
                    caches.match(isHFRequest ? hfUrl : pathname).then((response) => {
                        if (!response) {
                            return fetch(e.request).then(async (networkResponse) => {
                                if (networkResponse && networkResponse.status === 200) {
                                    await caches.open(cacheVersion).then((cache) => {
                                        return cache.put(isHFRequest ? hfUrl : pathname, networkResponse.clone())
                                    })
                                }
                                return networkResponse
                            })
                        }
                        return response
                    })
                )
                return
            }

            // Prefer network for other requests but cache the response for future offline requests
            e.respondWith(
                // @ts-ignore
                fetch(e.request)
                    .then((response) => {
                        let responseClone = response.clone()
                        caches.open(cacheVersion).then((cache) => {
                            cache.put(e.request, responseClone)
                        })
                        return response
                    })
                    .catch(async () => {
                        let match = caches.match(e.request)
                        if (match) {
                            return match
                        } else {
                            return new Response("No internet is available currently.", { status: 200 })
                        }
                    })
            )
            return
        }

        if (e.request.method === "POST") {
            e.respondWith(
                fetch(e.request.clone()).catch(() => {
                    return new Response(null, { status: 503, statusText: "Service Unavailable" })
                })
            )

            e.waitUntil(
                fetch(e.request.clone()).catch(() => {
                    return savePostRequest(e.request.clone())
                })
            )
            return
        }

        if (e.request.method === "PUT" || e.request.method === "DELETE") {
            e.respondWith(
                fetch(e.request.clone()).catch(() => {
                    return new Response(null, { status: 503, statusText: "Service Unavailable" })
                })
            )
        }
    })

self.addEventListener("message", async (event) => {
    if (event.data && event.data.type === "CHECK_SYNC_STATUS") {
        let posts = await get("postRequests") ?? []
        event.ports[0].postMessage({ hasPendingSync: posts.length > 0 })
    }
})

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

self.addEventListener("sync", (event: Event /* SyncEvent */) => {
    // @ts-ignore
    if (event.tag === "syncPostRequests") {
        // @ts-ignore
        return event.waitUntil(syncPostRequests())
    }
})

async function syncPostRequests() {
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
            await fetch(request)
            requests = requests.filter(r => r !== savedRequest)
            await set("postRequests", requests)
        } catch (error) {
            console.error("Failed to sync request", error)
        }
    }
}

function isFile(url: URL) {
    return url.pathname.includes(".")
}