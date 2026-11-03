import { test, expect, expectRedirect, createCategory, createTransaction, firstCategoryId } from "../fixtures"

test("export leaves out deleted transactions and can delete what it exports", async ({ api, html }) => {
    await createCategory(api, "expense", "Dining")
    let categoryId = await firstCategoryId(api, html)
    await createTransaction(api, { description: "Out to lunch with my delightful wife.", date: "2024-12-31", categoryId, amount: 100 })
    await createTransaction(api, { description: "This will be soft deleted.", date: "2024-12-30", categoryId, amount: 10 })

    let page = await html(await api.get("/app/transactions/"))
    let row = (text: string) => page.locator("tbody tr", { hasText: text })
    let keptId = await row("Out to lunch").locator("input[name=id]").getAttribute("value")
    let deletedId = await row("This will be soft deleted.").locator("input[name=id]").getAttribute("value")
    expectRedirect(await api.post("/app/transactions/delete/", { form: { id: deletedId! } }), "/app/transactions/")

    await test.step("the export page", async () => {
        page = await html(await api.get("/app/export/"))
        await expect(page.locator("h2")).toHaveText("Export Data")
        await expect(page.locator("form[action='/app/export/'][method=post]")).toHaveCount(1)
        await expect(page.locator("input[name=deleteTransactions]")).toBeChecked()
        await expect(page.locator("input[type=submit]")).toHaveCount(1)
    })

    let expectCsv = async (response: Awaited<ReturnType<typeof api.post>>) => {
        expect(response.status()).toBe(200)
        expect(response.headers()["content-disposition"]).toContain(`attachment; filename="cash-transactions.csv"`)
        let body = await response.text()
        expect(body).toContain("Date,Description,Amount,Category")
        expect(body).toContain(`2024-12-31,"Out to lunch with my delightful wife.",100,expense:Dining`)
        expect(body).not.toContain("This will be soft deleted.")
    }

    await test.step("export without deleting", async () => {
        // An unchecked checkbox isn't sent at all.
        await expectCsv(await api.post("/app/export/"))
        page = await html(await api.get("/app/transactions/"))
        let first = page.locator("table").first().locator("tbody tr").first()
        await expect(first.locator("form")).toHaveAttribute("action", "/app/transactions/delete/")
        await expect(first.locator("input[name=id]")).toHaveValue(keptId!)
    })

    await test.step("export and delete", async () => {
        await expectCsv(await api.post("/app/export/", { form: { deleteTransactions: "on" } }))
        page = await html(await api.get("/app/transactions/"))
        await expect(page.locator("main > p")).toHaveText("No active transactions found!")
        await expect(row("Out to lunch").locator("form")).toHaveAttribute("action", "/app/transactions/restore/")
        await expect(row("Out to lunch").locator("input[name=id]")).toHaveValue(keptId!)
    })
})
