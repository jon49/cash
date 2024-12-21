/// <reference path="../pb_data/types.d.ts" />

// Midnight cron job to remove deleted categories
cronAdd("removeDeletedCategories", "0 0 * * *", () => {
    let now = new Date()
    let last24hours = now.setDate(now.getDate() - 1).toJSON().replace('T', ' ')
    let categories = $app.findRecordsByFilter("categories", `deleted < '${last24hours}'`)

    for (let category of categories) {
        $app.delete(category)
    }
})

// Midnight cron job to remove deleted transactions
cronAdd("removeDeletedTransactions", "0 0 * * *", () => {
    let now = new Date()
    let last24hours = now.setDate(now.getDate() - 1).toJSON().replace('T', ' ')
    let transactions = $app.findRecordsByFilter("transactions", `deleted < '${last24hours}'`)

    for (let transaction of transactions) {
        $app.delete(transaction)
    }
})