# AGENTS.md

## Repository shape

- Three packages, no npm workspaces or hoisting: root orchestration, `client/` React 18 + Vite 6, `server/` Express 4, `cli/` (`apiforge`) with init/import/run.
- `client/src/index.css` is the entire styling system; no Tailwind or component library.
- Server routes in `server/index.js` are thin; business logic lives in `server/services/`, helpers in `server/utils/`, guards and middleware in `server/middleware/`.
- `docs/index.html` is a standalone static landing page, not part of the Vite app.
- Root `package.json` only orchestrates scripts; `concurrently` is its only dependency.

## Setup

- Run `npm run install:all`. Root `npm install` alone is insufficient: each package has its own lockfile and `node_modules`.
- `server/index.js` loads `.env` from the repository root first, not from `server/`. Copy `.env.example` to `.env` for local AI calls.
- Without `GEMINI_API_KEY`, the server uses the predefined offline demo suite; do not require a key for ordinary verification.

## Commands

- `npm run dev`: server on :5000 and Vite on :5173.
- `npm run build`: client build only; writes `client/dist` (generated; never hand-edit). Production Express serves this directory when `NODE_ENV=production`, so build before a production start.
- `npm --prefix server test`: all server tests.
- `npm run test:cli`: CLI tests.
- `npm run cli -- --help`: smoke-check the CLI wiring.
- Single tests: `node --test server/test/<name>.test.js` and `node --test cli/test/<name>.test.js`.
- There is no lint, typecheck, or formatter script; do not invent one.

## Playwright

- `client/playwright.config.js` has no `webServer`. Start `npm run dev` first, then from `client/` run `npx playwright test` or `npx playwright test tests/browser-smoke.spec.js`.
- Tests expect http://localhost:5173 and API http://localhost:5000. `APIFORGE_URL` overrides the client base URL.
- Accessible control names are load-bearing: `Run the demo`, `Test my API`, `Import OpenAPI`, `Import Postman`, `Run N tests`, `Inspect failure: ...`, and the theme/demo switch labels. Preserve them when changing UI.

## Verification order

- CI parity: `npm run install:all` → `npm run build` → `npm --prefix server test` → `npm run test:cli` → `npm run cli -- --help` → Playwright.
- CI uses Node 24 deliberately: Node 20's test runner can crash on non-ASCII child stdout. Do not lower it.
- Definition of done: build, server tests, CLI tests; add Playwright when UI or user flows change.

## Cross-package coupling

- Client imports server utilities by relative path (for example, `../../../server/utils/environmentResolver.js`); server tests import client utilities and services (for example, `../../client/src/utils/...`). Search both packages before renaming or moving shared code.
- When moving code across the boundary, only import pure/isomorphic utilities into the browser bundle; never pull server-only modules into client code.

## Runtime wiring

- Development: Vite on :5173 proxies `/api` to Express on :5000. Production: Express serves built `client/dist` on :5000.
- `server/index.js` exports `app` and skips `listen()` when `NODE_ENV=test` or argv contains `test`; tests start ephemeral servers.
- `/api/openapi` mounts its own larger JSON parser before the global 1 MB parser; keep that ordering.
- Rate limits are skipped under `NODE_ENV=test`; do not rely on them in tests.

## Testing quirks

- Server tests use `node:test` and `assert`, not Jest. Demo-backed runner tests reset `/api/demo/reset` before each test.
- Tests run offline using the predefined demo plan; no Gemini key is needed.
- `client/tests` specs are integration-style and require the running dev stack.

## Security boundaries

- Keep secrets out of source, browser bundles, and logs. BYOK keys are sent as `x-gemini-api-key` and held in session storage, not files.
- Environment substitution and redaction go through shared helpers in `server/utils/environmentResolver.js` and `authResolver.js`.
- Do not weaken the SSRF guard: only relative `/api/demo/` paths and same-port local demo URLs are allowed; private/reserved hosts, metadata endpoints, and DNS-resolved private targets are blocked.
- Preserve the CORS allowlist and rate limits.

## Source of truth

- README documents features and setup, but package scripts, `server/index.js`, `client/vite.config.js`, and `.github/workflows/ci.yml` override stale prose.
- `docs/index.html` changes do not affect the React app.
