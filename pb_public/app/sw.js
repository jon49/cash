// Superseded by the root scoped worker at /sw.js.
//
// This one's scope is "/app/", which is more specific than "/", so as long as it
// stays registered it keeps control of the app pages. It exists only to step
// aside for browsers that pick up the update here before they run the new
// app.js. Caches are left alone -- they are shared with the new worker, which
// clears out the stale ones itself.
self.addEventListener("install", () => self.skipWaiting())

self.addEventListener("activate", e => e.waitUntil(self.registration.unregister()))

self.addEventListener("fetch", () => { })
