# Uploads and media

Uploads are a stateful subsystem. Read `src/middleware/upload.js` and `src/routes/upload.js` before changing them.

## Current behavior

- Multer writes multipart field `file` directly to `uploads/` with a timestamp/random filename.
- `POST /upload` reads optional query `type`, but currently ignores its value; stored `type` is the uploaded file's MIME type. The optional `user-id` header defaults to `unknown`.
- Sharp creates `thumbnail-<stored filename>` at width 200 while preserving aspect ratio.
- Metadata is appended to the split-database `uploads` collection through lowdb chain `.write()` calls.
- `GET /uploads/*` is static middleware registered before custom/generated API routes.
- `GET /getMedias` requires `user-id` and returns metadata for the first matching upload, omitting internal stored user identity from normal results.

## Constraints and verification

Do not replace multer with global JSON parsing, rename stored files after metadata is written, or bulk-delete `uploads/`. An upload failure during thumbnail generation returns HTTP 500, but the route does not implement rollback/cleanup of the original file; account for that behavior when debugging.

For upload changes, send a real multipart request, verify the returned original and thumbnail URLs, fetch both static files, call `/getMedias` with the same header, verify the `uploads` collection change, and clean up only artifacts created for the test.
