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

    let replacementText = $app.findRecordsByFilter("settings", `user='${userId}' && name='replacementText'`)[0]?.get("value") ?? ""
    let replacer = replacementText.split("|")
        .map(x => {
            if (!x) return
            let [reg, text] = x.trim().split("->")
            return [new RegExp(reg, "g"), text]
        })
        .filter(x => x)

    let transactionViews = transactions.map(transaction => {
        let category = categories.find(category => category.id === transaction.get("category"))
        let categoryView = `${category.get("category_type")}:${category.get("name")}`
        for (let [reg, text] of replacer) {
            categoryView = categoryView.replace(reg, text)
        }
        return `${transaction.get("date").toString().slice(0, 10)},"${transaction.get("description").replace('"', '\\"')}",${transaction.get("amount")},${categoryView}`
    })

    let csv = `Date,Description,Amount,Category\n${transactionViews.join("\n")}`

    if (deleteTransactions === "on") {
        for (let transaction of transactions) {
            transaction.set("deleted", new Date().toISOString())
            $app.save(transaction)
        }
    }

    e.response.header().set("Content-Type", "text/csv")
    e.response.header().set("Content-Disposition", `attachment; filename="cash-transactions.csv"`)

    return e.string(200, csv)
})
