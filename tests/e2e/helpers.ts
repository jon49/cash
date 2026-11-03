import { expect, type BrowserContext, type Page } from "@playwright/test"
import http from "node:http"
import type { AddressInfo } from "node:net"

export let unique = (prefix: string) => `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/** Log in through the login form. */
export async function login(page: Page) {
    await page.goto("/login")
    await page.fill("input[name=email]", process.env.E2E_EMAIL!)
    await page.fill("input[name=password]", process.env.E2E_PASSWORD!)
    await Promise.all([page.waitForURL(/\/app\//), page.click("input[type=submit]")])
}

/** The new transaction page, making a category first if there isn't one yet. */
export async function gotoNewTransaction(page: Page) {
    await page.goto("/app/transactions/edit/")
    if (page.url().includes("/categories/edit")) {
        await page.fill("input[name=subcategory]", "E2E")
        await Promise.all([page.waitForURL(/\/app\/categories\/$/), page.click("button[form=categoryForm]")])
        await page.goto("/app/transactions/edit/")
    }
}

/**
 * Wait for the service worker to install, which includes filling its cache, and
 * reload so it controls the page.
 */
export async function installWorker(page: Page) {
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await page.evaluate(() => navigator.serviceWorker.ready)
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
}

/** Count htmz swaps in every page of the context, see `swaps`. */
export async function countSwaps(context: BrowserContext) {
    await context.addInitScript(() => {
        let w = window as unknown as { swaps: number }
        w.swaps = 0
        document.addEventListener("hz:completed", () => w.swaps++)
    })
}

/**
 * Run `action` and wait until htmz has swapped its response in. Each offline
 * save shows the same message, so the text alone can't tell one from the next.
 */
export async function afterSwap(page: Page, action: () => Promise<unknown>) {
    let before = await page.evaluate(() => (window as unknown as { swaps: number }).swaps)
    await action()
    await page.waitForFunction(n => (window as unknown as { swaps: number }).swaps > n, before)
}

/** Fill in the transaction form's description and amount. */
export async function fillTransaction(page: Page, description: string, amount: string) {
    await page.fill("input[name=description]", description)
    await page.fill("input[name=amount]", amount)
}

export async function sync(page: Page) {
    await expect(page.locator("#sync")).toBeVisible()
    await Promise.all([page.waitForEvent("load"), page.click("#sync button")])
    await expect(page.locator("#sync")).toBeHidden()
}

export type ProxyMode =
    /** Pass requests on to the server. */
    | "up"
    /** Drop the connection, as if nothing were listening. */
    | "down"
    /** Answer 502, like a reverse proxy with the server behind it down. */
    | "502"

/**
 * A proxy in front of the app, so a test can take "the server" away while the
 * browser's network stays up.
 */
export async function startProxy(target: string) {
    let mode: ProxyMode = "up"
    let server = http.createServer((req, res) => {
        if (mode === "down") return req.socket.destroy()
        if (mode === "502") return res.writeHead(502, { "Content-Type": "text/plain" }).end("Bad Gateway")

        let url = new URL(req.url!, target)
        let upstream = http.request(url, { method: req.method, headers: { ...req.headers, host: url.host } }, up => {
            res.writeHead(up.statusCode!, up.headers)
            up.pipe(res)
        })
        upstream.on("error", () => res.writeHead(502).end())
        req.pipe(upstream)
    })
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))

    return {
        origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
        set mode(value: ProxyMode) { mode = value },
        async close() {
            server.closeAllConnections()
            await new Promise(resolve => server.close(resolve))
        },
    }
}
