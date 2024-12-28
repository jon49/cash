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
    }
}