/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/transactions/edit/", e => {
    let id = e.request.url.query().get("id")
    let data = {
        header: "New Transaction",
        get title() { return this.header },
        edit: false,
        msg: e.request.url.query().get("msg"),
    }

    let { getCategorySelectData } = require(`${__hooks}/transactions_edit.js`)
    data.categories = getCategorySelectData(e, $app)
    if (data.categories.length === 0) {
        return e.redirect(302, "/app/categories/edit/")
    }

    if (id) {
        let transaction = $app.findRecordById("transactions", id)
        if (transaction.get("user") !== e.get("userId")) {
            return e.redirect(302, "/app/transactions/edit/?msg=Unauthorized")
        }
        let categoryId = transaction.get("category")
        let { formatDate } = require(`${__hooks}/utils.js`)
        Object.assign(data, {
            id,
            header: "Edit Transaction",
            edit: true,
            date: formatDate(transaction.get("date")),
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
        `${__hooks}/pages/transactions_edit_select_categories_template.html`,
    ).render(data)

    return e.html(200, html)
})

routerAdd("post", "/app/transactions/edit/", e => {
    let { id, date, description, categoryId, amount } = e.requestInfo().body
    let userId = e.get("userId")
    let transaction

    if (id) {
        // Update
        transaction = $app.findRecordById("transactions", id)
        if (transaction.get("user") !== userId) {
            return e.redirect(302, "/app/transactions/edit/?msg=Unauthorized")
        }
    } else {
        // Create
        let collection = $app.findCollectionByNameOrId("transactions")
        transaction = new Record(collection)
        transaction.set("user", userId)
    }

    transaction.set("date", date)
    transaction.set("description", description)
    transaction.set("amount", +amount)
    transaction.set("category", categoryId)
    $app.save(transaction)

    e.redirect(302, `/app/transactions/`)
})
