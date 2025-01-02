/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/settings/", e => {
    let data = {
        currencyMsg: e.request.url.query().get("currencyMsg"),
        replacementTextMsg: e.request.url.query().get("replacementTextMsg"),
    }

    let userId = e.get("userId")
    let settings = $app.findRecordsByFilter("settings", `user='${userId}'`)

    for (let setting of settings) {
        data[setting.get("name")] = setting.get("value")
    }

    if (!data.currency) {
        data.currency = "$"
    }

    const html = $template.loadFiles(
        `${__hooks}/pages/layout.html`,
        `${__hooks}/pages/settings.html`,
    ).render(data)

    return e.html(200, html)
})

routerAdd("post", "/app/settings/", e => {
    console.log("POST /app/settings/")
    let { value, id } = e.requestInfo().body
    let userId = e.get("userId")

    let record
    try {
        record = $app.findFirstRecordByFilter("settings", `user='${userId}' && name='${id}'`)
    } catch (_) { }

    console.log("RECORD 0", record)
    if (!record) {
        console.log("RECORD 1")
        let collection = $app.findCollectionByNameOrId("settings")
        record = new Record(collection)
        record.set("user", userId)
        record.set("name", id)
        record.set("value", value)
        console.log("RECORD 2", record)
    } else {
        record.set("value", value)
        console.log("RECORD 3", record)
    }

    console.log("SAVE!")
    $app.save(record)

    console.log("RETURN")
    if (e.request.header.get("HF-Request") === "true") {
        console.log("RETURN 1")
        return e.html(200, `<x-delete><p class=msg>Saved!</p></x-delete>`)
    }
    console.log("RETURN 2")
    return e.redirect(302, `/app/settings/?${id}Msg=Saved!`)
})