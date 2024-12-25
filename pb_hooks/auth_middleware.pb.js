/// <reference path="../pb_data/types.d.ts" />

routerUse(e => {
    if (!e.request.url.path.startsWith("/app")) {
        return e.next()
    }
    let sessionCookie = e.request.cookies().find(cookie => cookie.name === "session")
    let session = sessionCookie?.value
    if (!session) return e.redirect(302, "/login")

    let sessionRecord
    try {
        sessionRecord = $app.findRecordById("sessions", session)
    } catch (_) {
        return e.redirect(302, "/login")
    }

    e.set("userId", sessionRecord.get("user"))
    e.next()
})