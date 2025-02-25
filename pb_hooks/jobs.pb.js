/// <reference path="../pb_data/types.d.ts" />

// Midnight cron job to remove deleted categories
cronAdd("removeDeletedCategories", "0 0 * * *", () => {
    var now = new Date()
    var yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    let last24hours = yesterday.toJSON().replace('T', ' ')
    let categories = $app.findRecordsByFilter("categories", `deleted != '' && deleted < '${last24hours}'`)

    for (let category of categories) {
        $app.delete(category)
    }
})

// Midnight cron job to remove deleted transactions
cronAdd("removeDeletedTransactions", "0 0 * * *", () => {
    var now = new Date()
    var yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    let last24hours = yesterday.toJSON().replace('T', ' ')
    let transactions = $app.findRecordsByFilter("transactions", `deleted != '' && deleted < '${last24hours}'`)

    for (let transaction of transactions) {
        $app.delete(transaction)
    }
})