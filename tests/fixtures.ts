import { test as base, expect, type APIRequestContext, type APIResponse, type Page } from "@playwright/test"

export { expect }

let credentials = () => ({ email: process.env.E2E_EMAIL!, password: process.env.E2E_PASSWORD! })

/** POST /login and return the session id from its cookie. */
export async function login(request: APIRequestContext) {
    let response = await request.post("/login", { form: credentials(), maxRedirects: 0 })
    expectRedirect(response, "/app/transactions/edit")
    let session = /^session=([^;]+)/.exec(setCookie(response, "session") ?? "")?.[1]
    expect(session, "login sets the session cookie").toBeTruthy()
    return session!
}

/** The Set-Cookie header for `name`, if the response sets it. */
export function setCookie(response: APIResponse, name: string) {
    return response.headersArray()
        .find(h => h.name.toLowerCase() === "set-cookie" && h.value.startsWith(`${name}=`))
        ?.value
}

export function expectRedirect(response: APIResponse, location: string) {
    expect(response.status(), `${response.url()} redirects`).toBe(302)
    expect(response.headers()["location"]).toBe(location)
}

type Fixtures = {
    /**
     * A request client logged in as the test user, whose data has just been
     * wiped, so every test starts with no categories, transactions or settings.
     * It doesn't follow redirects, so they can be asserted on.
     */
    api: APIRequestContext
    /** A request client with no session. */
    anon: APIRequestContext
    /** Loads a 200 HTML response into the page so it can be queried with locators. */
    html: (response: APIResponse) => Promise<Page>
}

export const test = base.extend<Fixtures>({
    anon: async ({ playwright, baseURL }, use) => {
        let anon = await playwright.request.newContext({ baseURL, maxRedirects: 0 })
        await use(anon)
        await anon.dispose()
    },

    api: async ({ playwright, baseURL, anon }, use) => {
        // The session cookie is `secure`. Browsers send it to http://127.0.0.1,
        // but Playwright's request client doesn't, so pass it along by hand.
        let client = (session: string) => playwright.request.newContext({
            baseURL,
            maxRedirects: 0,
            extraHTTPHeaders: { cookie: `session=${session}` },
        })

        // Wiping the data also ends every session, so log in again afterwards.
        let wipe = await client(await login(anon))
        let wiped = await wipe.post("/app/delete-all-data/")
        expect(await wiped.json()).toEqual({ success: true })
        await wipe.dispose()

        let api = await client(await login(anon))
        await use(api)
        await api.dispose()
    },

    html: async ({ page }, use) => {
        await use(async response => {
            expect(response.status(), `${response.url()} is OK`).toBe(200)
            await page.setContent(await response.text())
            return page
        })
    },
})

/** Create a category through the form, as a user would. */
export async function createCategory(api: APIRequestContext, category: "expense" | "income", subcategory: string) {
    expectRedirect(await api.post("/app/categories/edit/", { form: { category, subcategory } }), "/app/categories/")
}

/** Create a transaction through the form, as a user would. */
export async function createTransaction(api: APIRequestContext, form: {
    description: string, date: string, categoryId: string, amount: number
}) {
    expectRedirect(await api.post("/app/transactions/edit/", { form }), "/app/transactions/")
}

/** The id of the first category in the new transaction form's select. */
export async function firstCategoryId(api: APIRequestContext, html: Fixtures["html"]) {
    let page = await html(await api.get("/app/transactions/edit/"))
    let id = await page.locator("select[name=categoryId] option").first().getAttribute("value")
    expect(id).toBeTruthy()
    return id!
}
