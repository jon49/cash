/// <reference path="../pb_data/types.d.ts" />

routerAdd("get", "/app/transactions/", e => {
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

    let allTransactions = transactions.map(transaction => {
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
            deleted: transaction.get("deleted").toString(),
        }
    })

    let data = {
        transactions: allTransactions
            .filter(transaction => transaction.deleted === ""),
        deletedTransactions: allTransactions
            .filter(transaction => transaction.deleted !== ""),
    }

    data.hasDeleted = data.deletedTransactions.length > 0
    data.hasTransactions = data.transactions.length > 0
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

routerAdd("post", "/app/transactions/delete/", e => {
    // Delete
    let { id } = e.requestInfo().body
    if (!id) {
        return e.redirect(302, `/app/transactions?msg=Transaction not found!`)
    }

    let record = $app.findRecordById("transactions", id)
    if (!record) {
        return e.redirect(302, `/app/transactions?msg=Transaction not found!`)
    }
    record.set("deleted", new Date().toISOString())

    $app.save(record)

    return e.redirect(303, `/app/transactions`)
})

routerAdd("post", "/app/transactions/restore/", e => {
    // Delete
    let { id } = e.requestInfo().body
    if (!id) {
        return e.redirect(302, `/app/transactions?msg=Transaction not found!`)
    }

    let record = $app.findRecordById("transactions", id)
    if (!record) {
        return e.redirect(302, `/app/transactions?msg=Transaction not found!`)
    }
    record.set("deleted", "")
    $app.save(record)

    return e.redirect(303, `/app/transactions`)
})
