import { defineConfig, devices } from "@playwright/test"
import { readFileSync } from "node:fs"

// Share the Hurl suite's settings: tests/<env>.env holds the url and the test
// user's email and password. Pick another file with E2E_ENV, e.g. E2E_ENV=ci.
let env = Object.fromEntries(
    readFileSync(`tests/${process.env.E2E_ENV ?? "local"}.env`, "utf8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"))
        .map(line => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]))

process.env.E2E_EMAIL = env.email
process.env.E2E_PASSWORD = env.password

export default defineConfig({
    testDir: "tests/e2e",
    // The tests share one user's data in one database, so run them one at a time.
    workers: 1,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    reporter: "list",
    use: {
        baseURL: env.url,
        trace: "retain-on-failure",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
    webServer: {
        command: "./tasks/start.sh",
        url: `${env.url}/login`,
        reuseExistingServer: true,
    },
})
