/// <reference path="../pb_data/types.d.ts" />

routerUse(e => {
    if (!e.request.url.path.startsWith("/app")) {
        return e.next()
    }
    let sessionCookie = e.request.cookie("session")
    let session = sessionCookie?.value
    if (!session) return e.redirect(302, "/login")

    let sessionRecord = $app.findRecordById("sessions", session)
    if (!sessionRecord) return e.redirect(302, "/login")

    e.set("userId", sessionRecord.get("user"))
    e.next()
})