/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/categories/edit", e => {
    let id = e.request.url.query().get("id")
    let msg = e.request.url.query().get("msg")
    let data = {
        header: "New Category",
        get title() { return this.header },
        edit: false,
        msg,
    }
    if (id) {
        let record = $app.findRecordById("categories", id)
        if (record.get("user") !== e.get("userId")) {
            return e.redirect(302, "/app/categories/edit")
        }
        Object.assign(data, {
            header: "Edit Category",
            edit: true,
            id: record.get("id"),
            category: record.get("category_type"),
            subcategory: record.get("name")
        })
    }

    const html = $template.loadFiles(
        `${__hooks}/pages/layout.html`,
        `${__hooks}/pages/categories_edit.html`,
        `${__hooks}/pages/category_form.html`,
    ).render(data)

    return e.html(200, html)
})

routerAdd("post", "/app/categories/edit", e => {
    let { category, subcategory, id } = e.requestInfo().body
    let userId = e.get("userId")

    let record
    if (id) {
        record = $app.findRecordById("categories", id)
        if (record.get("user") !== userId) {
            return e.redirect(302, "/app/categories/edit?msg=Unauthorized")
        }
    } else {
        let collection = $app.findCollectionByNameOrId("categories")
        record = new Record(collection)
    }

    record.set("user", userId)
    record.set("category_type", category)
    record.set("name", subcategory)
    $app.save(record)
    e.redirect(302, `/app/categories`)
})
