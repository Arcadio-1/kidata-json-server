# Routes and route development

## Generated versus custom routes

json-server automatically serves root values reconstructed from `data/` when their shapes are supported by json-server. Use that behavior for straightforward collection CRUD. Add a custom route when response shape, nested lookup, computed values, filtering, workflow state, or upload handling differs from generic CRUD.

All custom modules are registered in `server.js` before the generated router. Each exports a registration function receiving `server` and `router`; the upload module also receives multer middleware.

| Module | Main responsibility / notable prefixes |
| --- | --- |
| `upload.js` | `POST /upload`, `GET /getMedias` |
| `nestedData.js` | company/user nested lookup endpoints such as `/sharedDisplays/:companyId` |
| `tickets.js` | ticket lists, messages, and pagination (`/ticketsWithCount`) |
| `messages.js` | internal messages, comments, archive/delete workflows |
| `notifications.js` | notification filtering and seen-state updates |
| `addOns.js` | subscribe/cancel add-ons |
| `cart.js` | computed cart response, item changes, and checkout flows |
| `scheduleBookings.js` | booking list and `POST /schedule` |
| `companyApprovals.js` | `/super-company-approvals/*` view/state routes |
| `companyManagement.js` | `/super/company-management/*` company, users, roles, offers, approvals, audit data |

Read the owning file for exact payloads and response shapes; this document intentionally does not duplicate every endpoint.

## Persistence and parsing

Custom mutations read through `router.db` and must call a lowdb chain `.write()` after changing state. A chain write persists the complete split database via the adapter.

Several modules deliberately install scoped JSON parsers: cart, schedule bookings, Company Management, notification seen updates, and ticket message creation. Do not add a global body parser or move these handlers without checking multipart upload behavior.

## Pagination, sorting, and errors

`src/utils/pagination.js` provides positive-integer parsing, date-aware sorting, and comma-separated filter-set parsing. Paginated list routes generally use `page` and `pageSize`; ticket-message pagination uses `page` and `limit`. Some routes also use `sortBy`, `order`, and feature-specific filters. Reuse the helper behavior rather than making one route silently differ.

Routes commonly respond with `{ error: "..." }` or `{ message: "..." }` and an appropriate status. Match the local route’s established shape.

## Change checklist

1. Identify whether generated CRUD already fits the requirement.
2. Read the owning route and affected collection shape, not all fixtures.
3. Preserve registration/parsing order and persist mutations with `.write()`.
4. Run a focused test or HTTP check; for mutations, also verify restart persistence and restore test data.
