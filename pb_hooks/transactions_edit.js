/// <reference path="../pb_data/types.d.ts" />
// Create code for transaction edit category select template

module.exports = {
    /**
     * @param {core.RequestEvent} e
     * @param {excludeHooks<pocketbase.PocketBase>} $app
     */
    getCategorySelectData(e, $app) {
        let records = $app.findRecordsByFilter("categories", `user='${e.get("userId")}' && deleted=''`, "category_type,name")

        let { capitalize } = require(`${__hooks}/utils.js`)
        return records.map(x => ({
            category: `${capitalize(x.get("category_type"))} - ${x.get("name")}`,
            id: x.id,
        }))
    },
    /**
     * @param {core.RequestEvent} e
     * @param {excludeHooks<pocketbase.PocketBase>} $app
     * @param {template.Registry} $template
     * @param {string} __hooks
     * @param {*} utils
     * @param {Function} getCategorySelectData
     */
    getEditTransactionPage(e, $app, $template, __hooks, utils, getCategorySelectData) {
        let id = e.request.url.query().get("id")
        let data = {
            header: "New Transaction",
            get title() { return this.header },
            edit: false,
            msg: e.request.url.query().get("msg"),
        }

        // let getCategorySelectData = this.getCategorySelectData //require(`${__hooks}/transactions_edit.js`)
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
            let { formatDate } = utils // require(`${__hooks}/utils.js`)
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
    }
}