import { test, expect } from "@playwright/test"
import { gotoNewTransaction, login, unique } from "./helpers"

// End to end checks for the htmz progressive enhancement
// (pb_public/web/js/htmz.js): with JS forms swap fragments in through a hidden
// iframe, without JS the very same forms do normal round trips. Offline
// behaviour is in offline.spec.ts.

test.describe("with JavaScript", () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
        await gotoNewTransaction(page)
    })

    test("adds the iframe and leaves targets out of the markup", async ({ page }) => {
        await expect(page.locator("iframe[name=htmz]")).toHaveCount(1)
        await expect(page.locator("[target=htmz], [formtarget=htmz]")).toHaveCount(0)
    })

    test("Add Category dialog adds and selects the new category", async ({ page }) => {
        await page.click("text=Add Category")
        await expect(page.locator("#dialog x-modal dialog[open]")).toBeVisible()
        await expect(page.locator("#categoryForm input[name=subcategory]")).toBeFocused()

        let name = unique("Dialog")
        await page.fill("#categoryForm input[name=subcategory]", name)
        await page.click("#dialog button[form=categoryForm]")

        await expect(page.locator("#select-category option:checked")).toContainText(name)
        await expect(page.locator("x-modal")).toHaveCount(0)
        await expect(page.locator("html")).not.toHaveClass(/modal-is-open/)
        expect(page.url()).toMatch(/\/app\/transactions\/edit\/$/)
    })

    test("Save & New swaps in a fresh form", async ({ page }) => {
        let description = unique("Save and new")
        await page.fill("input[name=description]", description)
        await page.fill("input[name=amount]", "12.34")
        await page.click("text=Save & New")

        await expect(page.locator("input[name=amount]")).toHaveValue("")
        await expect(page.locator("input[name=amount]")).toBeFocused()
        await expect(page.locator("input[name=date]")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)
        await expect(page.locator("iframe[name=htmz]")).toHaveCount(1)
        expect(page.url()).toMatch(/\/app\/transactions\/edit\/$/)

        await page.goto("/app/transactions/")
        await expect(page.locator("body")).toContainText(description)
    })

    test("Save follows the redirect and back takes one press", async ({ page }) => {
        let description = unique("Save")
        await page.fill("input[name=description]", description)
        await page.fill("input[name=amount]", "5")
        await Promise.all([page.waitForURL(/\/app\/transactions\/$/), page.click("button:text-is('Save')")])
        await expect(page.locator("body")).toContainText(description)

        await page.goBack()
        expect(page.url()).toMatch(/\/app\/transactions\/edit\/$/)
    })

    test("settings save in place", async ({ page }) => {
        await page.goto("/app/settings/")
        let input = page.locator("form:has(input[value=currency]) input[name=value]")
        let msg = page.locator("#currencyMsg")
        let original = await input.inputValue()
        // It only submits on change, so it has to be a different value.
        await input.fill(original === "€" ? "$" : "€")
        await input.press("Tab")
        await expect(msg).toContainText("Saved!")
        expect(page.url()).toMatch(/\/app\/settings\/$/)

        // Put it back. The message removes itself, so wait for that first.
        await expect(msg).toBeEmpty({ timeout: 10_000 })
        await input.fill(original)
        await input.press("Tab")
        await expect(msg).toContainText("Saved!")
    })
})

test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false })

    test.beforeEach(async ({ page }) => {
        await login(page)
        await gotoNewTransaction(page)
    })

    test("has no iframe and the forms do full round trips", async ({ page, context }) => {
        await expect(page.locator("iframe")).toHaveCount(0)

        await page.fill("input[name=description]", unique("No JS"))
        await page.fill("input[name=date]", "2025-02-01")
        await page.fill("input[name=amount]", "3")
        await Promise.all([page.waitForLoadState("load"), page.click("text=Save & New")])
        await expect(page.locator("header nav")).toHaveCount(1)
        expect(context.pages()).toHaveLength(1)

        await Promise.all([page.waitForURL(/\/app\/categories\/edit\//), page.click("text=Add Category")])
        await expect(page.locator("header nav")).toHaveCount(1)
        await expect(page.locator("#categoryForm[hz]")).toHaveCount(0)

        await page.goto("/app/settings/")
        await page.fill("form:has(input[value=currency]) input[name=value]", "$")
        await Promise.all([
            page.waitForURL(/currencyMsg=Saved/),
            page.click("form:has(input[value=currency]) button"),
        ])
        expect(context.pages()).toHaveLength(1)
    })
})

test("no page errors", async ({ page }) => {
    let errors: string[] = []
    page.on("pageerror", e => errors.push(String(e)))
    await login(page)
    await gotoNewTransaction(page)
    await page.click("text=Add Category")
    await expect(page.locator("#dialog x-modal dialog[open]")).toBeVisible()
    await page.keyboard.press("Escape")
    await page.click("text=Save & New")
    await page.goto("/app/settings/")
    expect(errors).toEqual([])
})
