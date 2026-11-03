import { test, expect, expectRedirect, createCategory, firstCategoryId } from "../fixtures"

// Requests carrying the `_hz` field htmz adds get fragments back: no layout,
// and top level elements whose id (or hz-target) says where they go.

test.beforeEach(async ({ api }) => {
    await createCategory(api, "expense", "Dining")
})

test("the Add Category dialog", async ({ api, html }) => {
    let page = await html(await api.get("/app/transactions/edit/"))
    let action = await page.locator("form[hz][action*='/categories/']").getAttribute("action")
    expect(action).toBe("/app/categories/edit/")

    page = await html(await api.get(action!, { params: { _hz: 1 } }))
    await expect(page.locator("header nav")).toHaveCount(0)
    await expect(page.locator("x-modal")).toHaveAttribute("hz-target", "#dialog")
    await expect(page.locator("x-modal")).toHaveAttribute("hz-swap", "replaceChildren")
    await expect(page.locator("dialog header p")).toHaveText("New Category")
    await expect(page.locator("form#categoryForm[hz]")).toHaveCount(1)
    await expect(page.locator("#categoryForm select[name=category]")).toHaveCount(1)
    await expect(page.locator("#categoryForm input[name=subcategory]")).toHaveCount(1)

    // Without htmz it is the full page, and its form does a normal round trip.
    page = await html(await api.get(action!))
    await expect(page.locator("header nav")).toHaveCount(1)
    await expect(page.locator("form#categoryForm[hz]")).toHaveCount(0)
})

test("saving a category from the dialog returns the new select", async ({ api, html }) => {
    let page = await html(await api.post("/app/categories/edit/", {
        form: { category: "income", subcategory: "SideHustle", _hz: 1 },
    }))
    await expect(page.locator("header")).toHaveCount(0)
    await expect(page.locator("body > select#select-category")).toHaveCount(1)
    await expect(page.locator("#select-category option:checked")).toHaveText("Income - SideHustle")
})

test("Save & New returns a fresh form", async ({ api, html }) => {
    let categoryId = await firstCategoryId(api, html)
    let page = await html(await api.get("/app/transactions/edit/"))
    let formaction = await page.getByRole("button", { name: "Save & New" }).getAttribute("formaction")

    page = await html(await api.post(formaction!, {
        form: { description: "Testing 2", date: "2025-01-12", categoryId, amount: 112, _hz: 1 },
    }))
    await expect(page.locator("header")).toHaveCount(0)
    await expect(page.locator("body > form#transaction-edit-form")).toHaveCount(1)
    await expect(page.locator("input[name=amount]")).toHaveValue("")
    await expect(page.locator("input[name=amount]")).toHaveAttribute("autofocus", "")

    page = await html(await api.get("/app/transactions/"))
    await expect(page.locator("tbody")).toContainText("Testing 2")
})

test("Save still redirects, which htmz then follows", async ({ api, html }) => {
    let categoryId = await firstCategoryId(api, html)
    let response = await api.post("/app/transactions/edit/", {
        form: { description: "Plain save", date: "2025-01-12", categoryId, amount: 1, _hz: 1 },
    })
    expectRedirect(response, "/app/transactions/")
})

test("settings return the message for the setting that was saved", async ({ api, html }) => {
    let response = await api.post("/app/settings/", { form: { id: "currency", value: "¥", _hz: 1 } })
    expect(response.headers()["content-type"]).toBe("text/html; charset=utf-8")
    let page = await html(response)
    await expect(page.locator("body > div#currencyMsg p")).toContainText("Saved")
})
