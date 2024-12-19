/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/transactions", e => {
    let userId = e.get("userId")
    let transactions = $app.findRecordsByFilter("transactions", `user='${userId}'`)

    if (transactions.length === 0) {
        e.redirect(302, "/app/transactions/edit?msg=Create a transaction first.")
    }

    let categories = $app.findRecordsByFilter("categories", `user='${userId}'`)

    let { capitalize, formatDate } = require(`${__hooks}/utils.js`)
    let data = {
        transactions: transactions.map(transaction => {
            let date = formatDate(transaction.get("date"))
            let category = categories.find(category => category.id === transaction.get("category"))
            let categoryName = `${capitalize(category.get("category_type"))} - ${category.get("name")}`
            return {
                id: transaction.id,
                date,
                description: transaction.get("description"),
                amount: +transaction.get("amount"),
                category: categoryName,
            }
        }),
    }

    data.total = data.transactions.reduce((sum, transaction) => {
            if (transaction.category.startsWith("Income")) {
                return sum + transaction.amount
            }
            return sum - transaction.amount
        }, 0)

    const html = $template.loadFiles(
        `${__hooks}/pages/layout.html`,
        `${__hooks}/pages/transactions.html`,
    ).render(data)

    return e.html(200, html)
})