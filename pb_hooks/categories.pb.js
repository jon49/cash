/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/categories", e => {
    let records = $app.findRecordsByFilter("categories", `user='${e.get("userId")}'`, "category_type,name")
    if (records.length === 0) {
        return e.redirect(302, "/app/categories/edit")
    }

    let {capitalize} = require(`${__hooks}/utils.js`)

    let data = records.map(x => ({
        category: capitalize(x.get("category_type")),
        subcategory: x.get("name"),
        id: x.id,
    }))

    const html = $template.loadFiles(
        `${__hooks}/pages/layout.html`,
        `${__hooks}/pages/categories.html`,
    ).render({categories: data})

    return e.html(200, html)
})
