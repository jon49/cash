import { test, expect, expectRedirect, login, setCookie } from "../fixtures"

test("login page has the login form", async ({ anon, html }) => {
    let page = await html(await anon.get("/login"))
    let form = page.locator("form")
    await expect(form).toHaveAttribute("action", "/login")
    await expect(form).toHaveAttribute("method", "post")
    await expect(form.locator("input[name=email]")).toHaveCount(1)
    await expect(form.locator("input[name=password]")).toHaveCount(1)
    await expect(form.locator("input[type=submit]")).toHaveCount(1)
})

test("login sets the session cookie", async ({ anon }) => {
    // login() asserts the redirect and the cookie.
    await login(anon)
})

test("a wrong password goes back to the login page", async ({ anon }) => {
    let response = await anon.post("/login", {
        form: { email: process.env.E2E_EMAIL!, password: "not the password" },
    })
    expect(response.status()).toBe(302)
    expect(response.headers()["location"]).toMatch(/^\/login\?msg=/)
    expect(setCookie(response, "session")).toBeUndefined()
})

test("app pages redirect to login without a session", async ({ anon, playwright, baseURL }) => {
    expectRedirect(await anon.get("/app/"), "/login")

    let wrong = await playwright.request.newContext({
        baseURL,
        maxRedirects: 0,
        extraHTTPHeaders: { cookie: "session=wrong-session-cookie" },
    })
    expectRedirect(await wrong.get("/app/"), "/login")
    await wrong.dispose()
})

test("logout ends the session", async ({ api, html }) => {
    let page = await html(await api.get("/app/settings/"))
    await expect(page.locator("a[href='/app/logout/']")).toHaveCount(1)

    let response = await api.get("/app/logout/")
    expectRedirect(response, "/login")
    // It has to match the cookie login set, path and all, or the browser keeps it.
    let cookie = setCookie(response, "session")!
    expect(cookie).toMatch(/^session=;/)
    expect(cookie).toMatch(/; Path=\/app(;|$)/)
    expect(cookie).toMatch(/; Max-Age=0(;|$)/)

    // The session is gone on the server too, not just the cookie.
    expectRedirect(await api.get("/app/settings/"), "/login")
})
