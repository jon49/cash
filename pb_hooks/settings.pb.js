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
    let { value, id } = e.requestInfo().body
    let userId = e.get("userId")

    let record = $app.findRecordsByFilter("settings", `user='${userId}' && name='${id}'`, void 0, 1)[0]

    value = value.trim()

    if (!record) {
        let collection = $app.findCollectionByNameOrId("settings")
        record = new Record(collection)
        record.set("user", userId)
        record.set("name", id)
        record.set("value", value)
    } else {
        record.set("value", value)
    }

    $app.save(record)

    if (e.request.header.get("HF-Request") === "true") {
        return e.html(200, `<x-delete><p class=msg>Saved!</p></x-delete>`)
    }
    return e.redirect(302, `/app/settings/?${id}Msg=Saved!`)
})