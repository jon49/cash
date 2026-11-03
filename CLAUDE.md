# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A cash-transaction tracker that exports CSV (for hledger or spreadsheets). It runs entirely inside **PocketBase v0.23.12**: there is no separate backend. Server code lives in `pb_hooks/` (PocketBase's JS VM, goja), pages are server-rendered Go templates, and the client works without JavaScript and is then progressively enhanced, including offline support through a service worker.

## Commands

- `./tasks/start.sh`: run the app (`pocketbase serve --dev`) at http://127.0.0.1:8090. The `pocketbase` binary must be on PATH. First-time setup (import `schema/pb_schema.json` in the admin UI, create a verified user) is described in README.md.
- `npm start`: esbuild watch that bundles `src/app/sw.ts` to `pb_public/sw.js`. Only needed when changing the service worker.
- `./tasks/build.sh`: production build into `dist/`. It copies the hooks, public files and migrations, adds `?_=<md5>` cache busters to static references in `pb_hooks/pages/*.html` and `manifest.json`, builds the worker to `dist/public/web/js/sw.js`, replaces `__CACHE_VERSION__` with a timestamp, and writes a `dist/public/sw.js` loader that calls `importScripts` on it.
- Tests use [Hurl](https://hurl.dev/) 6.0.0 against a running server. Start the server first, then run `./tests/test-all.sh` (add `--debug` for verbose output, `--env <name>` to use `tests/<name>.env`; `local` is the default). The env file sets `email`, `password` and `url`, and that user must exist.
- To run a single test file, log in first to fill the cookie jar, then run the file with it (from `tests/`):
  ```
  hurl --test --variables-file local.env --cookie-jar cookie-jar.tsv login.hurl
  hurl --test --variables-file local.env --cookie cookie-jar.tsv transaction.tests.hurl
  ```
  `clean-db.hurl` wipes the test user's data, and `test-all.sh` runs it first.

There is no linter and no JS unit test suite.

## Architecture

**Routing and hooks (`pb_hooks/`).** PocketBase loads every `*.pb.js` file automatically. These files register routes with `routerAdd`, middleware with `routerUse` and cron jobs with `cronAdd`. Plain `*.js` files (`utils.js`, `transactions_edit.js`) are shared modules. goja runs each handler in an isolated context, so a handler must `require(\`${__hooks}/utils.js\`)` *inside* its body; top-level imports and shared module state are not visible to handlers. For the same reason, `transactions_edit.js` takes `$app`, `$template` and similar globals as parameters. goja also has no `Intl`, and some regex behavior is unusual (see the comment in `utils.js`).

**Auth.** The app does not use PocketBase's auth tokens. `POST /login` creates a record in the `sessions` collection and stores its id in an httpOnly `session` cookie scoped to `/app`. `auth_middleware.pb.js` guards every `/app*` path: it looks up the session and sets `e.set("userId", ...)`, which handlers read with `e.get("userId")`. Handlers must check that a record's `user` matches `userId` before reading or writing it.

**Data model** (`schema/pb_schema.json`): `categories`, `transactions`, `settings` (name/value pairs per user, such as currency) and `sessions`, all keyed by `user`. Categories and transactions are **soft-deleted** through a `deleted` datetime field. Queries filter on `deleted=''`, and the pages offer a restore option. `jobs.pb.js` hard-deletes records once they have been soft-deleted for more than 24 hours.

**Pages.** Handlers render `$template.loadFiles(layout.html, page.html, ...partials)`. Every page is a plain HTML form that POSTs and then redirects (PRG), so it works without JS.

**Progressive enhancement (`pb_public/web/js/`).** `html-form.min.js` ("htmf") intercepts forms and links that carry `hf-target`, `hf-select`, `hf-swap` and similar attributes. It sends them with the header `HF-Request: true` and swaps the HTML fragment it gets back. Handlers check `e.request.header.get("HF-Request") === "true"` to return a partial instead of redirecting. Two response headers also drive it: `hf-events` carries a JSON message, and a 204 means no swap. `app.js` defines small custom elements and an `x-<event>` attribute-based event delegation helper.

**Service worker (`src/app/sw.ts`, the only TS/bundled code).** It is served from `/sw.js` so its scope covers the whole site. `pb_public/app/sw.js` is a legacy stub that unregisters itself; leave it in place. Behavior:
- On install, it precaches the app shell and `alwaysCache` partials. Partials are fetched with `HF-Request` and cached under a `/hf` key prefix so they never get served to a full page navigation.
- GET pages are network-first, with a cache fallback on network failure or 5xx. Static files (any path containing `.`) and `alwaysCache` paths are cache-first with a background refresh. Cache keys drop the `?_=` buster param.
- POSTs that fail are queued in IndexedDB (`idb-keyval`, key `postRequests`) and replayed in order through `POST /sw/sync`, except paths in `neverQueue`. The worker answers a queued POST with a 204 carrying an `hf-events` message.
- `/api/` and `/_/` (PocketBase API and admin UI) bypass the worker.

When you add a page or partial that must work offline, update the `precache`/`alwaysCache` lists in `sw.ts`. When you add a POST that makes no sense to replay later, add it to `neverQueue`.

**Generated:** `pb_public/sw.js` is the committed esbuild output of `src/app/sw.ts`. Edit the TS source and rebuild with `npm start`; don't edit the JS directly.

**Gitignored:** `pb_data/` (database plus `types.d.ts`, which the `/// <reference>` lines in hooks point at), `pb_migrations/`, `dist/`, and images in `pb_public/web/images/` other than `cash.svg` (download link in README).
