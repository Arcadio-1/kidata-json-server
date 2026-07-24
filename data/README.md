# Split database

`data/` is the database source of truth. Edit the smallest relevant resource file.

Change one design in `data/designs/<id>.json`. Never create a design record without adding its ID to `data/designs/index.json`, and preserve that index order unless an intentional ordering change is required.

Use the API when testing behavior that should exercise persistence. Do not reintroduce or maintain a generated root `db.json`; `npm run db:split` is an intentional import/migration command, not part of normal server startup.
