import { test, expect, expectRedirect, createCategory, firstCategoryId } from "../fixtures"

test("create, edit, delete and restore a transaction", async ({ api, html }) => {
    await createCategory(api, "expense", "Dining")

    let categoryId = await test.step("the new transaction form is empty", async () => {
        let page = await html(await api.get("/app/transactions/edit/"))
        await expect(page.locator("h2")).toHaveText("New Transaction")
        let form = page.locator("form[action='/app/transactions/edit/'][method=post]")
        await expect(form).toHaveCount(1)
        await expect(form.locator("input[name=description]")).toHaveValue("")
        await expect(form.locator("input[name=date]")).toHaveValue("")
        await expect(form.locator("input[name=amount]")).toHaveValue("")
        await expect(form.locator("input[name=id]")).toHaveCount(0)
        await expect(form.locator("select[name=categoryId] option")).toHaveCount(1)
        await expect(page.locator("button[formaction='/app/transactions/edit/?addAnother']")).toHaveCount(1)
        return firstCategoryId(api, html)
    })

    let id = await test.step("create one, trimming the description", async () => {
        let response = await api.post("/app/transactions/edit/", {
            form: { description: "      Out to lunch with my wife.      ", date: "2024-12-31", categoryId, amount: 100 },
        })
        expectRedirect(response, "/app/transactions/")

        let page = await html(await api.get("/app/transactions/"))
        await expect(page.locator("h2")).toHaveText("Transactions")
        let cells = page.locator("table tbody tr").first().locator("td")
        await expect(cells.nth(0).locator("a")).toHaveText("2024-12-31")
        await expect(cells.nth(1)).toHaveText("Expense - Dining")
        await expect(cells.nth(2)).toHaveText("($100.00)")
        await expect(cells.nth(3)).toHaveText("Out to lunch with my wife.")
        await expect(cells.nth(4).locator("form")).toHaveAttribute("action", "/app/transactions/delete/")
        await expect(page.locator("table tfoot tr").first()).toContainText("Total")
        await expect(page.locator("table tfoot tr").first()).toContainText("($100.00)")
        // The logo, the "New" nav link and "Add Transaction".
        await expect(page.locator("a[href='/app/transactions/edit/']")).toHaveCount(3)

        let href = await cells.nth(0).locator("a").getAttribute("href")
        page = await html(await api.get(href!))
        await expect(page.locator("h2")).toHaveText("Edit Transaction")
        await expect(page.locator("form[action='/app/transactions/edit/'][method=post]")).toHaveCount(1)
        let id = await page.locator("form input[name=id]").getAttribute("value")
        expect(id).toBeTruthy()
        return id!
    })

    await test.step("edit it", async () => {
        let response = await api.post("/app/transactions/edit/", {
            form: { id, description: "Out to lunch with my delightful wife.", date: "2024-12-31", categoryId, amount: 100 },
        })
        expectRedirect(response, "/app/transactions/")

        let page = await html(await api.get("/app/transactions/"))
        let cells = page.locator("table tbody tr").first().locator("td")
        await expect(cells.nth(0).locator("a")).toHaveText("2024-12-31")
        await expect(cells.nth(0).locator("a")).toHaveAttribute("href", `/app/transactions/edit/?id=${id}`)
        await expect(cells.nth(1)).toHaveText("Expense - Dining")
        await expect(cells.nth(2)).toHaveText("($100.00)")
        await expect(cells.nth(3)).toHaveText("Out to lunch with my delightful wife.")
        await expect(page.locator("table tfoot tr").first()).toContainText("($100.00)")
        await expect(page.locator("table tbody tr")).toHaveCount(1)
    })

    await test.step("delete it", async () => {
        expectRedirect(await api.post("/app/transactions/delete/", { form: { id } }), "/app/transactions/")

        let page = await html(await api.get("/app/transactions/"))
        await expect(page.locator("main > p")).toHaveText("No active transactions found!")
        await expect(page.locator("summary")).toContainText("View Deleted Transactions")
        let row = page.locator("details tbody tr").first()
        await expect(row.locator("td").first()).toContainText("2024-12-31")
        await expect(row.locator("form")).toHaveAttribute("action", "/app/transactions/restore/")
        await expect(page.locator("tfoot")).toHaveCount(0)
    })

    await test.step("restore it", async () => {
        expectRedirect(await api.post("/app/transactions/restore/", { form: { id } }), "/app/transactions/")

        let page = await html(await api.get("/app/transactions/"))
        await expect(page.locator("table tbody tr").first().locator("td a")).toHaveText("2024-12-31")
        await expect(page.locator("summary")).toHaveCount(0)
    })

    await test.step("Save & New without htmz redirects back to the form", async () => {
        let response = await api.post("/app/transactions/edit/?addAnother", {
            form: { description: "Testing", date: "2025-01-12", categoryId, amount: 112 },
        })
        expectRedirect(response, "/app/transactions/edit/")
    })
})

test("income adds to the total and expenses take away from it", async ({ api, html }) => {
    await createCategory(api, "expense", "Dining")
    await createCategory(api, "income", "Pay")
    let page = await html(await api.get("/app/transactions/edit/"))
    let options = page.locator("select[name=categoryId] option")
    let expenseId = await options.filter({ hasText: "Dining" }).getAttribute("value")
    let incomeId = await options.filter({ hasText: "Pay" }).getAttribute("value")

    for (let [categoryId, amount] of [[expenseId, 1000.5], [incomeId, 2500]] as const) {
        let form = { description: "", date: "2025-01-01", categoryId: categoryId!, amount }
        expectRedirect(await api.post("/app/transactions/edit/", { form }), "/app/transactions/")
    }

    page = await html(await api.get("/app/transactions/"))
    await expect(page.locator("tbody td", { hasText: "Income - Pay" }).locator("xpath=..")).toContainText("$2,500.00")
    await expect(page.locator("tbody td", { hasText: "Expense - Dining" }).locator("xpath=..")).toContainText("($1,000.50)")
    await expect(page.locator("tfoot tr").first()).toContainText("$1,499.50")
})
