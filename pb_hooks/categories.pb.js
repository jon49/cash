/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/categories/", e => {
    let records = $app.findRecordsByFilter("categories", `user='${e.get("userId")}'`, "category_type,name")
    if (records.length === 0) {
        return e.redirect(302, "/app/categories/edit")
    }

    let { capitalize } = require(`${__hooks}/utils.js`)

    let categories = records.map(x => ({
        category: capitalize(x.get("category_type")),
        subcategory: x.get("name"),
        id: x.id,
        deleted: x.get("deleted").toString(),
    }))

    let data = {
        categories: categories.filter(x => x.deleted === ""),
        deletedCategories: categories.filter(x => x.deleted !== ""),
    }
    data.hasDeleted = data.deletedCategories.length > 0
    data.hasCategories = data.categories.length > 0

    const html = $template.loadFiles(
        `${__hooks}/pages/layout.html`,
        `${__hooks}/pages/categories.html`,
    ).render(data)

    return e.html(200, html)
})

routerAdd("post", "/app/categories/delete/", e => {
    // Delete
    let { id } = e.requestInfo().body
    if (!id) {
        return e.redirect(302, `/app/categories?msg=Category not found!`)
    }

    let record = $app.findRecordById("categories", id)
    if (!record) {
        return e.redirect(302, `/app/categories?msg=Category not found!`)
    }
    record.set("deleted", new Date().toISOString())

    $app.save(record)

    return e.redirect(303, `/app/categories`)
})

routerAdd("post", "/app/categories/restore/", e => {
    // Delete
    let { id } = e.requestInfo().body
    if (!id) {
        return e.redirect(302, `/app/categories?msg=Category not found!`)
    }

    let record = $app.findRecordById("categories", id)
    if (!record) {
        return e.redirect(302, `/app/categories?msg=Category not found!`)
    }
    record.set("deleted", "")
    $app.save(record)

    return e.redirect(303, `/app/categories`)
})
