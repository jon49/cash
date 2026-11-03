import { test, expect, expectRedirect } from "../fixtures"

test("with no categories the transaction page sends you to make one", async ({ api }) => {
    expectRedirect(await api.get("/app/transactions/edit/"), "/app/categories/edit/")
})

test("create, edit, delete and restore a category", async ({ api, html }) => {
    await test.step("the new category form is empty", async () => {
        let page = await html(await api.get("/app/categories/edit/"))
        await expect(page.locator("h2")).toHaveText("New Category")
        let form = page.locator("form[action='/app/categories/edit/']")
        await expect(form).toHaveAttribute("method", "post")
        await expect(form.locator("select[name=category] option[selected]")).toHaveCount(0)
        await expect(form.locator("input[name=subcategory]")).toHaveValue("")
        await expect(form.locator("input[name=id]")).toHaveCount(0)
    })

    let id = await test.step("create one, trimming the name", async () => {
        let response = await api.post("/app/categories/edit/", { form: { category: "expense", subcategory: "  Dinings   " } })
        expectRedirect(response, "/app/categories/")

        let page = await html(await api.get("/app/categories/"))
        await expect(page.locator("h2")).toHaveText("Categories")
        let row = page.locator("table tbody tr").first()
        await expect(row.locator("td").nth(0)).toHaveText("Expense")
        await expect(row.locator("td").nth(1)).toHaveText("Dinings")
        let href = await row.locator("td").nth(2).locator("a").getAttribute("href")
        expect(href).toMatch(/^\/app\/categories\/edit\/\?id=/)

        page = await html(await api.get(href!))
        await expect(page.locator("h2")).toHaveText("Edit Category")
        let form = page.locator("form[action='/app/categories/edit/']")
        await expect(form).toHaveAttribute("method", "post")
        await expect(form.locator("select option[selected]")).toHaveAttribute("value", "expense")
        await expect(form.locator("input[name=subcategory]")).toHaveValue("Dinings")
        let id = await form.locator("input[name=id]").getAttribute("value")
        expect(id).toBeTruthy()
        return id!
    })

    await test.step("edit it", async () => {
        let response = await api.post("/app/categories/edit/", { form: { category: "expense", subcategory: "Dining", id } })
        expectRedirect(response, "/app/categories/")

        let page = await html(await api.get("/app/categories/"))
        let row = page.locator("table tbody tr").first()
        await expect(row.locator("td").nth(0)).toHaveText("Expense")
        await expect(row.locator("td").nth(1)).toHaveText("Dining")
        await expect(row.locator("td").nth(2).locator("a")).toHaveAttribute("href", `/app/categories/edit/?id=${id}`)
    })

    await test.step("delete one", async () => {
        expectRedirect(
            await api.post("/app/categories/edit/", { form: { category: "income", subcategory: "Delete:Me" } }),
            "/app/categories/")

        let page = await html(await api.get("/app/categories/"))
        let row = page.locator("table tbody tr").nth(1)
        await expect(row.locator("td").nth(0)).toHaveText("Income")
        await expect(row.locator("td").nth(1)).toHaveText("Delete:Me")
        let action = await row.locator("form").getAttribute("action")
        let deleteId = await row.locator("input[name=id]").getAttribute("value")

        expectRedirect(await api.post(action!, { form: { id: deleteId! } }), "/app/categories/")

        page = await html(await api.get("/app/categories/"))
        await expect(page.locator("table").first().locator("tbody tr")).toHaveCount(1)
        await expect(page.locator("form[action='/app/categories/restore/'] input[name=id]")).toHaveValue(deleteId!)
        return deleteId!
    }).then(async deleteId => {
        await test.step("restore it", async () => {
            expectRedirect(await api.post("/app/categories/restore/", { form: { id: deleteId } }), "/app/categories/")
            let page = await html(await api.get("/app/categories/"))
            await expect(page.locator("table tbody tr")).toHaveCount(2)
            await expect(page.locator("details")).toHaveCount(0)
        })
    })
})
