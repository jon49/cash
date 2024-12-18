/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/transactions/edit", e => {
    let id = e.request.url.query().get("id")
    let data = {
        header: "New Transaction",
        get title() { return this.header },
        edit: false,
        msg: e.request.url.query().get("msg"),
    }

    let records = $app.findRecordsByFilter("categories", `user='${e.get("userId")}'`, "category_type,name")
    if (records.length === 0) {
        return e.redirect(303, "/app/categories/edit")
    }

    let {capitalize} = require(`${__hooks}/utils.js`)
    data.categories = records.map(x => ({
        category: `${capitalize(x.get("category_type"))} - ${x.get("name")}`,
        id: x.id,
    }))

    if (id) {
        let transaction = $app.findRecordById("transactions", id)
        if (transaction.get("user") !== e.get("userId")) {
            return e.redirect(303, "/app/transactions/edit?msg=Unauthorized")
        }
        let categoryId = transaction.get("category")
        Object.assign(data, {
            id,
            header: "Edit Transaction",
            edit: true,
            date: transaction.get("date"),
            description: transaction.get("description"),
            amount: transaction.get("amount"),
            categoryId: data.categories.find(y => y.id === categoryId).id,
        })
    } else {
        Object.assign(data, {
            date: "",
            description: "",
            amount: null,
            category: null,
        })
    }

    const html = $template.loadFiles(
        `${__hooks}/pages/layout.html`,
        `${__hooks}/pages/transactions_edit.html`,
    ).render(data)

    return e.html(200, html)
})

/// <reference path="../pb_data/types.d.ts" />

routerAdd("post", "/app/transactions/edit", e => {
    let { id, date, description, categoryId, amount } = e.requestInfo().body
    let userId = e.get("userId")
    let transaction

    if (id) {
        console.log("IIIIIIIIIIIIIIIDDDDDDDDDDDDD", id)
        transaction = $app.findRecordById("transactions", id)
        if (transaction.get("user") !== userId) {
            return e.redirect(303, "/app/transactions/edit?msg=Unauthorized")
        }
    } else {
        let collection = $app.findCollectionByNameOrId("transactions")
        transaction = new Record(collection)
        transaction.set("user", userId)
    }

    transaction.set("date", date)
    transaction.set("description", description)
    transaction.set("amount", +amount)
    transaction.set("category", categoryId)
    $app.save(transaction)

    e.redirect(303, `/app/transactions/edit?id=${transaction.id}&msg=Saved!`)
})
