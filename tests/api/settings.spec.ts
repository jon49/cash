import { test, expect, createCategory, createTransaction, firstCategoryId } from "../fixtures"

test("currency and replacement text are saved and used", async ({ api, html }) => {
    let field = (page: Awaited<ReturnType<typeof html>>, id: string) =>
        page.locator(`form:has(input[name=id][value=${id}]) input[name=value]`)

    await test.step("defaults", async () => {
        let page = await html(await api.get("/app/settings/"))
        await expect(field(page, "currency")).toHaveValue("$")
        await expect(field(page, "replacementText")).toHaveValue("")
        await expect(field(page, "replacementText")).toHaveAttribute("placeholder", "old->new")
    })

    await test.step("save without htmz", async () => {
        let response = await api.post("/app/settings/", { form: { id: "currency", value: "€" } })
        expect(response.status()).toBe(302)
        expect(response.headers()["location"]).toContain("/app/settings/?currencyMsg=")

        response = await api.post("/app/settings/", { form: { id: "replacementText", value: "expense->cheese" } })
        expect(response.status()).toBe(302)
        expect(response.headers()["location"]).toContain("/app/settings/?replacementTextMsg=")

        let page = await html(await api.get("/app/settings/"))
        await expect(field(page, "currency")).toHaveValue("€")
        await expect(field(page, "replacementText")).toHaveValue("expense->cheese")
    })

    await test.step("save with htmz", async () => {
        let response = await api.post("/app/settings/", { form: { id: "currency", value: "¥", _hz: 1 } })
        expect(response.status()).toBe(200)
        let page = await html(await api.get("/app/settings/"))
        await expect(field(page, "currency")).toHaveValue("¥")
    })

    await createCategory(api, "expense", "Dining")
    let categoryId = await firstCategoryId(api, html)
    await createTransaction(api, { description: "Out to lunch with my delightful wife.", date: "2024-12-31", categoryId, amount: 100 })

    await test.step("the transactions page uses the currency", async () => {
        let page = await html(await api.get("/app/transactions/"))
        await expect(page.locator("tbody tr").first().locator("td").nth(2)).toHaveText("(¥100.00)")
    })

    await test.step("the export uses the replacement text", async () => {
        let response = await api.post("/app/export/")
        expect(response.headers()["content-disposition"]).toContain(`attachment; filename="cash-transactions.csv"`)
        let body = await response.text()
        expect(body).toContain("Date,Description,Amount,Category")
        expect(body).toContain(`2024-12-31,"Out to lunch with my delightful wife.",100,cheese:Dining`)
    })
})
