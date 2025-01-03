/// <reference path="../pb_data/types.d.ts" />

routerAdd("post", "/app/delete-all-data/", e => {
    let userId = e.get("userId")

    let transactions = $app.findRecordsByFilter("transactions", `user='${userId}'`)
    let categories = $app.findRecordsByFilter("categories", `user='${userId}'`)
    let sessions = $app.findRecordsByFilter("sessions", `user='${userId}'`)
    let settings = $app.findRecordsByFilter("settings", `user='${userId}'`)

    for (let setting of settings) {
        $app.delete(setting)
    }

    for (let transaction of transactions) {
        $app.delete(transaction)
    }

    for (let category of categories) {
        $app.delete(category)
    }

    for (let session of sessions) {
        $app.delete(session)
    }

    return e.json(200, { success: true })
})
