import { test, expect } from "@playwright/test"

test("logging out clears the session cookie in the browser", async ({ page, context }) => {
    await page.goto("/login")
    await page.fill("input[name=email]", process.env.E2E_EMAIL!)
    await page.fill("input[name=password]", process.env.E2E_PASSWORD!)
    await Promise.all([page.waitForURL(/\/app\//), page.click("input[type=submit]")])
    let session = async () => (await context.cookies()).find(c => c.name === "session")
    expect(await session()).toBeTruthy()

    await page.goto("/app/settings/")
    await Promise.all([page.waitForURL(/\/login$/), page.click("a[href='/app/logout/']")])
    expect(await session()).toBeUndefined()
})
