import { get, set } from "idb-keyval"

let cacheVersion = "v1"

let alwaysCache = [
    "/app/categories/edit/",
]

self.addEventListener("install", (e: ExtendableEvent) =>
    e.waitUntil(
        caches.open(cacheVersion).then(cache => cache.addAll([...alwaysCache, "/app/transactions/edit/"]))
    )
)

self.addEventListener("activate", (e: ExtendableEvent) => { e.waitUntil(deleteOldCache()) })

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

        if (request.method === "GET") {
            if (isFile(url) || alwaysCache.includes(url.pathname)) {
                let isHFRequest = request.headers.get("HF-Request") === "true"
                let hfUrl = ""
                if (isHFRequest) {
                    hfUrl = `/hf${url.pathname}${url.search}`
                }
                let pathname = `${url.pathname}${url.search}`

                return e.respondWith(
                    caches.match(isHFRequest ? hfUrl : pathname).then((response) => {
                        if (!response) {
                            return fetch(request).then(async (networkResponse) => {
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
            }

            // Prefer network for other requests but cache the response for future offline requests
            return e.respondWith(
                // @ts-ignore
                fetch(request)
                    .then((response) => {
                        if (response.status === 503) {
                            let match = caches.match(request)
                            if (match) {
                                return match
                            } else {
                                return new Response("Service unavailable.", { status: 200 })
                            }
                        }
                        if (!response || response.status !== 200 || response.type !== "basic") {
                            return response
                        }
                        let responseClone = response.clone()
                        caches.open(cacheVersion).then((cache) => {
                            cache.put(request, responseClone)
                        })
                        return response
                    })
                    .catch(async () => {
                        let match = caches.match(request)
                        if (match) {
                            return match
                        } else {
                            return new Response(null, {
                                status: 204,
                                headers: {
                                    "hf-events": `{"message":"You are currently offline. Any changes will be saved and synced when you are back online."}`,
                                }
                            })
                        }
                    })
            )
        }

        if (request.method === "POST") {
            if (url.pathname.startsWith("/sw/sync")) {
                return e.respondWith(syncPostRequests(request))
            }

            // Save the request for later
            let clonedRequest = request.clone()
            e.respondWith(fetch(request).catch(async () => {
                await savePostRequest(clonedRequest)
                return new Response(null, {
                    status: 204,
                    headers: {
                        "hf-events": `{"message":"You are currently offline. Any changes will be saved and synced when you are back online."}`,
                    }
                })
            }))
        }
    })

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
            await fetch(request)
            requests = requests.filter(r => r !== savedRequest)
            await set("postRequests", requests)
        } catch (error) {
            console.error("Failed to sync request", error)
            return new Response("<p>Failed to sync request.</p>", { status: 200, headers: { "Content-Type": "text/html" } })
        }
    }

    console.log("referrer", req.referrer)
    console.log("url", req.url)
    return new Response(JSON.stringify({ redirectUrl: req.referrer }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
    })
}

function isFile(url: URL) {
    return url.pathname.includes(".")
}