# Data model and persistence

`data/` is the active database source of truth. `src/db/SplitFileAdapter.js` is a synchronous lowdb 1.x adapter used by `server.js`; do not replace it with a generated root database file.

## Layout

- `data/collections/<resource>.json` — one exact root value per resource. Values may be arrays, objects, primitives, or `null`.
- `data/designs/index.json` — ordered design IDs; this is the membership and display order source.
- `data/designs/<id>.json` — one complete design object per index entry.

Edit the smallest file possible. For designs, change the record file and keep the index in sync. To add a design, create a safe-ID file and add its ID to the intended index position. To remove one, remove its index entry and record file. Do not reorder the index accidentally.

## Adapter behavior

`read()` loads direct collection JSON files, then reconstructs `designs` by reading the index in order. It validates JSON, paths, duplicate IDs, missing records, and filename/`design.id` consistency.

`write(data)` validates and serializes the complete root object before changing managed files, writes collections and design records, writes `designs/index.json` after current records, then removes stale managed files. Each JSON file is formatted with two-space indentation and a trailing newline and is replaced through a temporary sibling file plus rename.

Per-file replacement is atomic; a write spanning multiple files is not a single filesystem transaction. The ordering above limits, but cannot eliminate, cross-file interruption risk. Filesystem and serialization errors propagate to callers.

## Working safely

Manual fixture edits change source data directly but do not exercise persistence code. Use API mutations when validating persistence, then restore temporary data before finishing. Do not place unrelated JSON files directly in managed collection/design directories.

```powershell
Get-ChildItem data\collections -File -Filter *.json | Select-Object -ExpandProperty Name
node -e "const d=require('./data/collections/tickets.json'); console.log(Array.isArray(d), d.length)"
node -e "const d=require('./data/designs/1.json'); console.log(d.id, d.name)"
```

`npm run db:split` is only an intentional import utility and requires a supplied legacy `db.json`; it is not part of startup. `npm run db:verify-split` likewise compares against that temporary legacy source, so use it before removing the source during an import. The ordinary adapter test is `npm run test:split-db`.
