# Split `db.json` migration plan

## Decision

Split the mock data into small, version-controlled JSON source files and use a
custom synchronous lowdb adapter. The adapter reconstructs the same root
database object that `json-server` receives today, and writes changes back to
the split files.

Do **not** use a generated `db.json` as the running database. That approach
would either lose API mutations at restart or require a separate sync step.
The adapter keeps `router.db`, automatic json-server CRUD endpoints, and the
existing custom routes working without route-level changes.

This is worthwhile here because `db.json` is about 1.1 MB across 107
top-level resources, while `designs` alone is about 697 KB. Agents will be
able to inspect one resource (or one design) instead of loading unrelated
fixtures.

## Target layout

```text
data/
  collections/
    addOns.json
    cart.json
    tickets.json
    users.json
    ...one file for every top-level resource except designs...
  designs/
    index.json
    1.json
    2.json
    ...one file per design record...
src/
  db/
    SplitFileAdapter.js
scripts/
  split-db.js
db.json                         # removed after the migration is verified
```

`data/collections/<resource>.json` contains the exact value formerly stored
at the matching root key. It may therefore be either an array or an object.

`data/designs/index.json` is an ordered JSON array of design IDs, for example
`[1, 2, 3]`. Each `data/designs/<id>.json` contains one complete design
object. The index preserves the existing collection order. All current design
records have unique IDs, so this split is safe.

Use the existing resource names exactly, including names containing hyphens.
Do not rename, normalize, combine, or change the shape of any collection.

## Implementation steps

1. Create `scripts/split-db.js` as a one-time migration utility.
   - Read the existing root `db.json` using `JSON.parse`.
   - Create `data/collections` and `data/designs`.
   - Write every root key except `designs` to
     `data/collections/<key>.json`, formatted with two-space indentation and
     a trailing newline.
   - Write the ordered `designs` IDs to `data/designs/index.json` and each
     design to `data/designs/<id>.json` using the same formatting.
   - Fail before writing if a design has no `id`, if IDs are duplicated, or if
     an output file would overwrite an unrelated file.
   - Keep the original `db.json` untouched during this step.

2. Add `src/db/SplitFileAdapter.js`.
   - Export a class with the lowdb adapter interface: synchronous `read()` and
     `write(data)` methods. It can extend `lowdb/adapters/Base`, or implement
     the same constructor contract.
   - `read()` must load every file directly under `data/collections`, using
     its filename (without `.json`) as the root key. It must then load design
     records in `index.json` order and expose them as the root `designs`
     array.
   - Validate malformed JSON, duplicate resource names, missing design files,
     duplicate IDs, and a mismatch between a design filename and `design.id`.
     Throw descriptive errors; do not silently omit data.
   - `write(data)` must persist all root collections back to the same layout.
     For `designs`, rewrite `index.json`, write/update the current per-ID
     files, and remove only stale files that are confirmed to be managed
     design-record JSON files. For other keys, write the matching collection
     file.
   - Use a temporary sibling file followed by rename for each JSON write, so a
     crash cannot leave a partially written JSON file. Keep the adapter
     synchronous because json-server 0.17 is currently configured with a
     synchronous `FileSync` adapter.
   - Do not put a catch-all `try/catch` around persistence. An I/O error must
     fail the request instead of reporting a successful mutation that was not
     saved.

3. Change only database initialization in `server.js`.
   - Add `const low = require("lowdb")` and import `SplitFileAdapter`.
   - Replace `jsonServer.router("db.json")` with a lowdb instance backed by
     `new SplitFileAdapter(path.join(__dirname, "data"))`, then pass that
     instance to `jsonServer.router(db)`.
   - Preserve the existing middleware and custom-route registration order
     exactly.
   - Update stale comments that say the auto-generated endpoints come from
     `db.json`; they now come from the split database.

4. Add an npm script, such as `db:split`, to run the migration utility. It is
   for the initial migration and for intentional future re-imports only; the
   running server persists through the adapter.

5. Add a short `data/README.md` for agents. It should state:
   - `data/` is the source of truth.
   - Edit the smallest relevant resource file; edit `data/designs/<id>.json`
     for a single design.
   - Never hand-create a new design record without adding its ID to
     `data/designs/index.json`.
   - Use the API for behavior that should exercise persistence.
   - Do not reintroduce a generated root `db.json`.

## Migration and verification

1. Run `npm run db:split` while `db.json` is still present.
2. Write a small Node verification script that reconstructs the split data
   through `SplitFileAdapter.read()` and compares it to the original parsed
   `db.json` with `assert.deepStrictEqual`. Run this before changing
   `server.js`.
3. Start the server and smoke-test:
   - `GET /designs`, `GET /tickets`, and a singular-object endpoint such as
     `GET /cart` return the same shapes as before.
   - A json-server mutation, for example creating then deleting a temporary
     ticket, survives a server restart and changes only the relevant split
     collection file.
   - A custom-route mutation (cart, notification, ticket message, or company
     management) survives restart, proving existing `router.db.write()` calls
     still work.
   - A design mutation survives restart and updates the matching
     `data/designs/<id>.json` plus `index.json` when its membership changes.
4. Run the existing `npm run test:company-management` test.
5. Inspect `git diff --check` and `git status`. Confirm the migrated data is
   semantically identical before removing `db.json`.

## Rollout and rollback

Commit the migration in one focused commit: adapter, migration script, data
directory, server initialization, npm script, README, and verification test.
Do not mix route refactors or fixture edits into that commit.

Keep `db.json` only until all verification steps pass. After removal, rollback
is simply reverting that commit, which restores the original single-file
database. Do not maintain both formats as editable sources; that would create
drift and defeats the token/context benefit.

## Acceptance criteria

- No API URL, response shape, or existing custom-route behavior changes.
- All 107 root resources load with the same values as the original file.
- `designs` retains its order and every design is independently readable.
- Both automatic json-server writes and custom `router.db.write()` calls
  persist to `data/` and survive restart.
- A Codex agent can inspect or edit one collection without opening the former
  1.1 MB monolithic file.
