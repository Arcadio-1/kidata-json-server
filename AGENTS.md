# Agent guide

## Project summary

This is a Node.js mock API for a digital-signage platform. `server.js` combines Express, json-server 0.17, custom Express routes, and lowdb 1.x. json-server provides CRUD for supported root collections; custom routes provide computed, nested, upload, pagination, and domain-specific behavior.

The active database source is `data/`, loaded and persisted synchronously by `src/db/SplitFileAdapter.js`. There is no runtime root `db.json`.

## Essential commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install locked dependencies. |
| `npm start` | Run the server with nodemon at `http://localhost:8000`. |
| `npm run test:split-db` | Test split-database loading and persistence safety. |
| `npm run test:company-management` | Test Company Management audit redaction. |

## Read-this-first task map

| Task | Read first |
| --- | --- |
| Add or change API behavior | [docs/routes.md](docs/routes.md), then the owning `src/routes/` module |
| Change server wiring | [docs/architecture.md](docs/architecture.md), `server.js` |
| Change persistence or fixtures | [docs/data-model-and-persistence.md](docs/data-model-and-persistence.md), `data/README.md` |
| Change uploads | [docs/uploads.md](docs/uploads.md) |
| Add or run tests | [docs/testing.md](docs/testing.md) |

## Non-negotiable constraints

- Preserve the middleware and route registration order in `server.js`. Custom routes must stay before the json-server router.
- Mutations through `router.db` must finish with `.write()`; persistence is synchronous.
- Do not replace route-scoped `express.json()` middleware with global parsing without checking upload flows and all affected route prefixes.
- Uploads create original files and thumbnails in `uploads/`; do not edit or clean this directory casually.
- `data/` is the only editable fixture source. Keep names exact, and never add a design file without its `data/designs/index.json` entry.
- Do not recreate a generated root `db.json`, modify fixtures/uploads without task authority, or mix unrelated refactors into a focused change.

## Repository map

- `server.js` — application setup and order-sensitive wiring.
- `src/routes/` — custom endpoint modules.
- `src/middleware/` — delay and multer configuration.
- `src/utils/` — pagination/sorting and audit redaction helpers.
- `src/db/` — split lowdb adapter and its tests.
- `data/` — versioned database source; designs are individually stored.
- `scripts/` — one-time split/import and legacy comparison utilities.
- `uploads/` — generated media and thumbnails; avoid broad reads/edits.
- `docs/` — task-focused references selected by the task map above.

## Conventions

- Use CommonJS (`require`, `module.exports`). Route modules register handlers with `(server, router[, upload])`.
- Comments are English. Existing code uses double quotes and semicolons.

## Efficient inspection

Read this file, then one focused document and the relevant module. Use `rg` before opening multiple files. Do not print whole fixture files, recursively read `uploads/`, or scan `node_modules/`.

```powershell
rg "router\.db|\.write\(" src
rg "server\.(get|post|put|patch|delete)" src/routes
```

## Verification expectations

Run the relevant test command for code changes, plus focused HTTP checks for route work. For persistence changes, see [docs/testing.md](docs/testing.md). Always finish with:

```powershell
git diff --check
git status --short
```
