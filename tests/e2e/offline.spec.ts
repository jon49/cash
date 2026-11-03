import { test as base, expect, type BrowserContext, type Page } from "@playwright/test"
import {
    afterSwap, countSwaps, fillTransaction, gotoNewTransaction, installWorker, login, startProxy, sync, unique,
} from "./helpers"

// The service worker keeps the app usable with no network, or with the network
// up but the server unreachable: pages come from its cache and POSTs are queued
// until the Sync Data button replays them.
//
// Every test talks to the app through its own proxy. Playwright's setOffline
// doesn't reliably cover requests the service worker makes (after a navigation
// they reach the server again), so "offline" here also has the proxy drop every
// connection. Each proxy is a new origin too, so each test starts with a fresh
// worker and cache.

// Named `server`, as Playwright already has a `proxy` option for the browser.
let test = base.extend<{ server: Proxy }>({
    server: async ({ }, use) => {
        let server = await startProxy(process.env.E2E_URL!)
        await use(server)
        await server.close()
    },
    baseURL: async ({ server }, use) => use(server.origin),
})

let offlineMessage = "You are currently offline"
let save = (page: Page) => page.click("button:text-is('Save')")
let saveAndNew = (page: Page) => page.click("text=Save & New")

/** Rows of the active (not deleted) transactions table. */
let activeRows = (page: Page, text: string) =>
    page.locator("main > div table tbody tr", { hasText: text })

type Proxy = Awaited<ReturnType<typeof startProxy>>
async function goOffline(context: BrowserContext, server: Proxy) {
    server.mode = "down"
    await context.setOffline(true)
}
async function goOnline(context: BrowserContext, server: Proxy) {
    await context.setOffline(false)
    server.mode = "up"
}

test.beforeEach(async ({ page, context }) => {
    await countSwaps(context)
    await login(page)
    await gotoNewTransaction(page)
    await installWorker(page)
})

test("a save made offline is queued and synced", async ({ page, context, server }) => {
    await goOffline(context, server)
    let description = unique("Offline")
    await fillTransaction(page, description, "7")
    await save(page)

    await expect(page.locator("#msg")).toContainText(offlineMessage)
    await expect(page.locator("#sync")).toBeVisible()
    expect(page.url()).toMatch(/\/app\/transactions\/edit\/$/)

    // The dialog partial comes from the cache.
    await page.click("text=Add Category")
    await expect(page.locator("#dialog x-modal dialog[open]")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.locator("x-modal")).toHaveCount(0)

    await goOnline(context, server)
    await sync(page)
    expect(page.url()).toMatch(/\/app\/transactions\/edit\/$/)

    await page.goto("/app/transactions/")
    await expect(activeRows(page, description)).toHaveCount(1)
})

test("Save & New made offline is queued and synced", async ({ page, context, server }) => {
    await goOffline(context, server)
    let description = unique("Offline save and new")
    await fillTransaction(page, description, "8")
    await saveAndNew(page)

    await expect(page.locator("#msg")).toContainText(offlineMessage)
    expect(page.url()).toMatch(/\/app\/transactions\/edit\/$/)

    await goOnline(context, server)
    await sync(page)
    await page.goto("/app/transactions/")
    await expect(activeRows(page, description)).toHaveCount(1)
})

test("the app opens from the cache with no network", async ({ page, context, server }) => {
    await goOffline(context, server)

    // A new tab, so nothing is left over from the page that was already open.
    let fresh = await context.newPage()
    await fresh.goto("/app/transactions/edit/")
    await expect(fresh.locator("h2")).toHaveText("New Transaction")
    await expect(fresh.locator("#select-category option")).not.toHaveCount(0)
    await expect(fresh.locator("input[name=date]")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)

    // "/" only ever redirects to the new transaction page.
    let root = await context.newPage()
    await root.goto("/")
    await expect(root.locator("h2")).toHaveText("New Transaction")
    await root.close()

    let description = unique("Opened offline")
    await fillTransaction(fresh, description, "9")
    await save(fresh)
    await expect(fresh.locator("#msg")).toContainText(offlineMessage)
    await expect(fresh.locator("#sync")).toBeVisible()

    // Unvisited pages have nothing cached and fall back to the offline page.
    let unvisited = await context.newPage()
    await unvisited.goto("/app/export/")
    await expect(unvisited.locator("body")).toContainText("This page isn't available offline.")
    await unvisited.close()

    await goOnline(context, server)
    await sync(fresh)
    await fresh.goto("/app/transactions/")
    await expect(activeRows(fresh, description)).toHaveCount(1)
})

test("several offline saves sync once each and in order", async ({ page, context, server }) => {
    // An existing transaction, with its edit page visited so it is cached.
    let edited = unique("Edited offline")
    await fillTransaction(page, edited, "100")
    await Promise.all([page.waitForURL(/\/app\/transactions\/$/), save(page)])
    let editUrl = await activeRows(page, edited).locator("a").getAttribute("href")
    await page.goto(editUrl!)

    await goOffline(context, server)

    // Edit it twice. Only replaying in order leaves the second amount.
    for (let amount of ["1", "2"]) {
        await page.fill("input[name=amount]", amount)
        await afterSwap(page, () => save(page))
        await expect(page.locator("#msg")).toContainText(offlineMessage)
    }

    // And add a few new ones, mixing Save and Save & New.
    await page.goto("/app/transactions/edit/")
    await expect(page.locator("h2")).toHaveText("New Transaction")
    let added = [unique("Queued A"), unique("Queued B"), unique("Queued C")]
    for (let [i, description] of added.entries()) {
        await fillTransaction(page, description, `${i + 1}`)
        await afterSwap(page, () => i % 2 ? saveAndNew(page) : save(page))
        await expect(page.locator("#msg")).toContainText(offlineMessage)
    }

    await goOnline(context, server)
    await sync(page)

    await page.goto("/app/transactions/")
    await expect(activeRows(page, edited)).toHaveCount(1)
    await expect(activeRows(page, edited)).toContainText("($2.00)")
    for (let description of added) {
        await expect(activeRows(page, description)).toHaveCount(1)
    }

    // Nothing is left in the queue to sync a second time.
    await expect(page.locator("#sync")).toBeHidden()
})

test("with the network up but the server unreachable, pages come from the cache and saves are queued", async ({ page, server }) => {
    let descriptions = { down: unique("Server down"), "502": unique("Server 502") }
    for (let mode of ["down", "502"] as const) {
        await test.step(`server ${mode === "down" ? "not answering" : "answering 502"}`, async () => {
            server.mode = mode
            // Opening the page gets the cached copy, not an error page.
            await page.goto("/app/transactions/edit/")
            await expect(page.locator("h2")).toHaveText("New Transaction")

            await fillTransaction(page, descriptions[mode], "4")
            await afterSwap(page, () => save(page))
            await expect(page.locator("#msg")).toContainText(offlineMessage)
            await expect(page.locator("#sync")).toBeVisible()
        })
    }

    server.mode = "up"
    await sync(page)
    await page.goto("/app/transactions/")
    for (let description of Object.values(descriptions)) {
        await expect(activeRows(page, description)).toHaveCount(1)
    }
})
