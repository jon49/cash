/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/transactions", e => {
    let userId = e.get("userId")
    let transactions = $app.findRecordsByFilter("transactions", `user='${userId}'`, "-date,-created")

    if (transactions.length === 0) {
        e.redirect(302, "/app/transactions/edit?msg=Create a transaction first.")
    }

    let categories = $app.findRecordsByFilter("categories", `user='${userId}'`)

    function formatAmountView(amount) {
        return amount < 0 ? `($${Math.abs(amount).toFixed(2)})` : `$${amount.toFixed(2)}`
    }
    let { capitalize, formatDate } = require(`${__hooks}/utils.js`)
    let data = {
        transactions: transactions.map(transaction => {
            let date = formatDate(transaction.get("date"))
            let category = categories.find(category => category.id === transaction.get("category"))
            let categoryName = `${capitalize(category.get("category_type"))} - ${category.get("name")}`
            let amount = categoryName.startsWith("Income") ? transaction.get("amount") : -transaction.get("amount")
            return {
                id: transaction.id,
                date,
                description: transaction.get("description"),
                amount,
                amountView: formatAmountView(amount),
                category: categoryName,
            }
        }),
    }

    data.total = formatAmountView(data.transactions.reduce((sum, transaction) => {
        return (transaction.category.startsWith("Income"))
            ? sum + transaction.amount
            : sum + transaction.amount
    }, 0))

    const html = $template.loadFiles(
        `${__hooks}/pages/layout.html`,
        `${__hooks}/pages/transactions.html`,
    ).render(data)

    return e.html(200, html)
})