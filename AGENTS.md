# Repository Guidelines

## Project Overview

This repository contains a Node.js/Express mock API server for a digital signage management platform. It uses json-server as a file-based JSON database (`db.json`) with custom Express routes layered on top for complex query logic such as pagination, filtering, and nested data.

## Commands

- Start the server with `npm start`. This runs `nodemon server.js` and serves the API at `http://localhost:8000`.
- No test or lint tooling is currently configured.

## Architecture

`server.js` is the entry point. Middleware and route registration order is critical and must be preserved:

1. json-server middleware for logging, static file serving, CORS, and cache control.
2. The one-second artificial delay in `src/middleware/delay.js`.
3. Static file serving for the `uploads/` directory.
4. Custom routes, registered before the json-server router:
   - `src/routes/upload.js`: file uploads, thumbnail generation, and media retrieval.
   - `src/routes/nestedData.js`: nested key lookups for shared displays, company roles, and user assignments.
   - `src/routes/tickets.js`: support tickets with pagination, filtering, and messaging.
   - `src/routes/messages.js`: internal messages with comments, archiving, and deletion.
   - `src/routes/notifications.js`: notifications with filtering and seen-state updates.
5. The json-server router mounted last at `/` for automatic CRUD operations on all `db.json` collections.

Each route module exports a `register(server, router)` function that binds handlers to the json-server app instance.

## Shared Utilities

- `src/utils/pagination.js` contains sorting and pagination helpers, including `parseIntOrDefault`, `sortItems`, `sortGeneric`, and `toSetOrNull`.
- `src/middleware/upload.js` contains the multer storage configuration and exports the `upload` instance and `uploadDir` path.

## Data Persistence

Custom routes read and write `db.json` through `router.db` (lowdb). Call `.write()` whenever a mutation must be persisted.

## Key Files

- `server.js`: application entry point and middleware/route wiring.
- `db.json`: primary JSON database with more than 100 collections.
- `uploads/`: uploaded files and generated thumbnails.
- `src/`: modular middleware, routes, and utilities.

## Conventions

- Write all code comments in English.
- Preserve the middleware and route registration order in `server.js`.
- Let json-server generate standard REST endpoints for database collections unless custom behavior is required.
- Custom endpoints use `page` and `pageSize` query parameters for pagination.
- Some routes intentionally use inline `express.json()` middleware, including ticket-message creation and notification seen-state updates. Do not replace it with app-level body parsing without verifying all upload routes and request flows.
- Keep changes focused and avoid modifying `db.json` or files in `uploads/` unless the task specifically requires data changes.
