/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/transactions/edit/", e => {
    let { getEditTransactionPage, getCategorySelectData } = require(`${__hooks}/transactions_edit.js`)
    let utils = require(`${__hooks}/utils.js`)
    return getEditTransactionPage(e, $app, $template, __hooks, utils, getCategorySelectData)
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
    transaction.set("description", description.trim())
    transaction.set("amount", +amount)
    transaction.set("category", categoryId)
    $app.save(transaction)

    if (e.request.url.query().has("addAnother")) {
        if (e.request.header.get("HF-Request") === "true") {
            let { getEditTransactionPage, getCategorySelectData } = require(`${__hooks}/transactions_edit.js`)
            let utils = require(`${__hooks}/utils.js`)
            return getEditTransactionPage(e, $app, $template, __hooks, utils, getCategorySelectData)
        }
        return e.redirect(302, `/app/transactions/edit/`)
    }
    e.redirect(302, `/app/transactions/`)
})
