/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/login", e => {
    let msg = e.request.url.query().get("msg")

    const html = $template.loadFiles(
        `${__hooks}/pages/layout.html`,
        `${__hooks}/pages/login.html`,
    ).render({ msg, loggedOut: true })

    return e.html(200, html)
})

routerAdd("post", "/login", e => {
    try {
        let form = e.requestInfo().body
        let tryAgain = "/login?msg=Oops! That didn't work. Please try again."
        let user = $app.findAuthRecordByEmail("users", form.email)
        if (!user) return e.redirect(302, tryAgain)
        if (!user.validatePassword(form.password)) return e.redirect(302, tryAgain)

        let collection = $app.findCollectionByNameOrId('sessions')
        let record = new Record(collection)
        record.set("user", user.id)
        $app.save(record)

        let token = record.id
        e.setCookie({
            value: token,
            path: "/app",
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 60, // 60 days
            name: "session",
        })

        e.redirect(302, "/app/transactions/edit")
    } catch (err) {
        console.log(err)
        return null
    }
})

routerAdd("get", "/app/logout/", e => {
    let sessionCookie = e.request.cookie("session")
    let session = sessionCookie?.value
    if (!session) return e.redirect(302, "/")

    let sessionRecord = $app.findRecordById("sessions", session)
    $app.delete(sessionRecord)
    e.setCookie({
        name: "session",
        maxAge: 0,
        value: "",
    })
    e.redirect(302, "/login")
})
