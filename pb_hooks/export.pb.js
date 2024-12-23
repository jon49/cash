/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/export/", e => {
    let msg = e.request.url.query().get("msg")

    const html = $template.loadFiles(
        `${__hooks}/pages/layout.html`,
        `${__hooks}/pages/export.html`,
    ).render({ msg })

    return e.html(200, html)
})

routerAdd("post", "/app/export/", e => {
    let { deleteTransactions } = e.requestInfo().body
    let userId = e.get("userId")

    let transactions = $app.findRecordsByFilter("transactions", `user='${userId}' && deleted=''`, "-date,-created")
    let categories = $app.findRecordsByFilter("categories", `user='${userId}'`)

    let transactionViews = transactions.map(transaction => {
        let category = categories.find(category => category.id === transaction.get("category"))
        return `${transaction.get("date").toString().slice(0, 10)},"${transaction.get("description").replace('"', '\\"')}",${transaction.get("amount")},${category.get("category_type")}:${category.get("name")}`
    })

    let csv = `Date,Description,Amount,Category\n${transactionViews.join("\n")}`

    if (deleteTransactions === "on") {
        for (let transaction of transactions) {
            transaction.set("deleted", new Date().toISOString())
            $app.save(transaction)
        }
    }

    return e.string(200, csv)
})
