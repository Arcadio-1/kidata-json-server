# Testing and verification

## Available automated checks

| Command | Coverage |
| --- | --- |
| `npm run test:split-db` | Split adapter read/write, validation, managed-file cleanup, formatting, and error propagation. |
| `npm run test:company-management` | Recursive redaction of sensitive Company Management audit values. |

There is no configured lint or formatter command. `test.ts` is empty and is not a test command.

`npm run db:verify-split` is a migration-time comparison command: it requires a temporary legacy root `db.json`. The active repository intentionally has no such runtime source, so use the adapter test for normal verification.

## Change-type matrix

| Change type | Minimum verification |
| --- | --- |
| Documentation only | Check links/commands, `git diff --check`, `git status --short` |
| Route read behavior | Relevant test if present, then HTTP request to the changed endpoint |
| Route mutation | Focused test/HTTP mutation, restart persistence check, restore data |
| Adapter or data-layout change | `npm run test:split-db`; migration-time comparison if legacy source is available |
| Company Management change | `npm run test:company-management` plus route checks |
| Upload change | Upload, static retrieval, thumbnail result, metadata retrieval, cleanup |

## Manual smoke testing

Start with `npm start`; the server listens on port 8000 and deliberately delays each request by one second. Use a read request before mutations:

```powershell
Invoke-RestMethod http://localhost:8000/designs
Invoke-RestMethod http://localhost:8000/tickets
Invoke-RestMethod http://localhost:8000/cart
```

For persistence work, capture the original value or use a uniquely identifiable temporary record. Perform the mutation, restart the server, verify it persisted, restore the original data through the same API when possible, restart again, and inspect only the affected `data/` file. Avoid mutation smoke tests for routine documentation/read-only work.
