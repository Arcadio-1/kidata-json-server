# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js/Express mock API server for a digital signage management platform. Uses json-server as a file-based JSON database (`db.json`) with custom Express routes layered on top for complex query logic (pagination, filtering, nested data).

## Commands

- **Start server:** `npm start` (runs `nodemon server.js`, serves on `http://localhost:8000`)
- No test or lint tooling is configured.

## Architecture

`server.js` is the entry point that wires everything together. The middleware and route registration order is critical and must be preserved:

1. **json-server middlewares** (logger, static file serving, CORS, no-cache)
2. **1-second artificial delay** (`src/middleware/delay.js`)
3. **Static file serving** for `uploads/` directory
4. **Custom routes** (registered before json-server router):
   - `src/routes/upload.js` — file upload with thumbnail generation + media retrieval
   - `src/routes/nestedData.js` — nested key lookups (sharedDisplays, companyRoles, userAssigned*)
   - `src/routes/tickets.js` — support tickets with pagination, filtering, messaging
   - `src/routes/messages.js` — internal messages with comments, archive, delete
   - `src/routes/notifications.js` — notifications with filtering and seen-marking
5. **json-server router** mounted last at `/` for automatic CRUD on all `db.json` collections

Each route module exports a `register(server, router)` function that binds handlers to the json-server app instance.

### Shared Utilities

- `src/utils/pagination.js` — sorting, pagination helpers (parseIntOrDefault, sortItems, sortGeneric, toSetOrNull)
- `src/middleware/upload.js` — multer storage config, exports `upload` instance and `uploadDir` path

### Data Persistence

Custom routes read/write `db.json` via `router.db` (lowdb) and call `.write()` to flush changes.

## Key Files

- `server.js` — entry point, middleware + route wiring
- `db.json` — primary JSON database (large, ~11K lines)
- `uploads/` — file upload storage directory
- `src/` — modularized middleware, routes, and utilities

## Conventions

- Comments must be in English.
- The database has 100+ collections; json-server auto-generates REST endpoints for all of them.
- Custom endpoints implement their own pagination via `page`/`pageSize` query params.
- Some routes use inline `express.json()` middleware (POST ticket messages, PATCH notification seen) — do not replace with app-level body parsing.
