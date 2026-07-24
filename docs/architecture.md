# Architecture and request flow

`server.js` is the only application entry point. It creates a json-server Express app, builds a synchronous lowdb instance with `SplitFileAdapter`, registers middleware and custom routes, then mounts the json-server router.

## Fixed registration order

1. `jsonServer.defaults()` — logger, static handling, CORS, and no-cache behavior.
2. `src/middleware/delay.js` — adds a one-second delay to every request.
3. `GET /uploads/*` static serving from the repository `uploads/` directory.
4. Custom route registrations, in source order: upload, nested data, tickets, messages, notifications, add-ons, cart, schedule bookings, company approvals, and Company Management.
5. `server.use(router)` — json-server generated routes, last.

```text
Request
  -> json-server defaults
  -> one-second delay
  -> /uploads static files
  -> custom Express routes
  -> json-server generated CRUD router
```

The last position prevents generated CRUD handlers from shadowing custom behavior. Route modules are independent only after preserving this ordering and their shared `router.db` instance.

## Database relationship

`low(new SplitFileAdapter(path.join(__dirname, "data")))` reconstructs the root object that json-server expects. `jsonServer.router(db)` exposes that same lowdb instance as `router.db` to custom modules. See [data-model-and-persistence.md](data-model-and-persistence.md).

## Safe change boundaries

- A focused route change normally needs only its route module, related utility, and route-level checks.
- Changes to `server.js`, route order, adapter behavior, body parsing, or upload wiring require broader regression checks because they affect multiple modules.
- No environment variables are read by the application; the port is the fixed `8000` in `server.js`.
