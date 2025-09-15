const jsonServer = require("json-server");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const server = jsonServer.create();
// const router = jsonServer.router("db-2.json");
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// Use default middlewares (logger, static, cors, and no-cache)
server.use(middlewares);

// Simulate a network delay for every request (1.5 seconds)
server.use((req, res, next) => {
  setTimeout(next, 1500);
});

// Set up file upload support
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// Serve static files from the uploads folder
server.use("/uploads", express.static(uploadDir));

/**
 * Custom endpoint for file uploads.
 * Expects a multipart/form-data POST request with key "file".
 * The user id must be provided in the request header "user-id".
 * Accepts an optional query parameter "type".
 * Generates a thumbnail and returns an object conforming to your MediaFile schema.
 */
server.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  // Extract type from query (optional) and user id from header
  const { type } = req.query;
  const userId = req.headers["user-id"] || "unknown";

  // Construct the original file URL
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;

  // Generate thumbnail filename and path
  const thumbnailFilename = `thumbnail-${req.file.filename}`;
  const thumbnailPath = path.join(uploadDir, thumbnailFilename);

  // Generate a thumbnail using sharp (resize width to 200px, preserve aspect ratio)
  try {
    await sharp(path.join(uploadDir, req.file.filename))
      .resize({ width: 200 })
      .toFile(thumbnailPath);
  } catch (err) {
    console.error("Error generating thumbnail:", err);
    return res.status(500).json({ message: "Error generating thumbnail" });
  }

  // Construct the thumbnail URL
  const thumbnailUrl = `${req.protocol}://${req.get(
    "host"
  )}/uploads/${thumbnailFilename}`;

  // Build the upload metadata object following your MediaFile schema.
  // We temporarily store userId for filtering, but it won't be returned.
  const uploadData = {
    uid: req.file.filename, // unique id
    url: fileUrl,
    name: req.file.originalname,
    status: "done",
    type: req.file.mimetype, // using the file's mimetype
    thumbUrl: thumbnailUrl,
    userId, // temporary property for filtering
  };

  // Ensure "uploads" array exists in db.json, then push the new upload metadata
  const db = router.db;
  if (!db.has("uploads").value()) {
    db.set("uploads", []).write();
  }
  db.get("uploads").push(uploadData).write();

  // Return the response matching the MediaFile schema (exclude userId)
  const { userId: removed, ...mediaFile } = uploadData;
  res.status(200).json({
    message: "File uploaded successfully",
    ...mediaFile,
  });
});

/**
 * Custom endpoint to retrieve uploaded file metadata based on user id.
 * Expects the user id to be provided in the request header "user-id".
 * Returns a list of files matching the MediaFile schema.
 */
server.get("/getMedias", (req, res) => {
  const userId = req.headers["user-id"];
  if (!userId) {
    return res.status(400).json({ message: "User ID not provided in header" });
  }
  const db = router.db;
  // Filter uploads by userId, then remove the extra userId property before returning.
  const uploads = db.get("uploads").filter({ userId }).value() || [];
  const mediaFiles = uploads.map(({ userId, ...media }) => media);
  res.json(
    mediaFiles.length
      ? mediaFiles[0]
      : {
          uid: "",
          url: "",
          status: "",
          type: "",
          thumbUrl: "",
          userId: "",
        }
  );
});

// Middleware to handle nested keys for sharedDisplays
server.get("/sharedDisplays/:companyId", (req, res) => {
  const { companyId } = req.params;
  const db = router.db;
  const sharedDisplays = db.get("sharedDisplays").value();

  if (sharedDisplays && sharedDisplays[companyId]) {
    res.json(sharedDisplays[companyId]);
  } else {
    res
      .status(404)
      .send({ error: `No data found for company ID: ${companyId}` });
  }
});

// Middleware to handle nested keys for companyRoles
server.get("/companyRoles/:companyId", (req, res) => {
  const { companyId } = req.params;
  const db = router.db;
  const roles = db.get("companyRoles").value();

  if (roles && roles[companyId]) {
    res.json(roles[companyId]);
  } else {
    res
      .status(404)
      .send({ error: `No data found for company ID: ${companyId}` });
  }
});

// Middleware to handle nested keys for generalAccessAreas
server.get("/generalAccessAreas/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("generalAccessAreas").find({ id }).value();

  // If the record exists and has the generalAccessAreas array, return just that array
  if (record && record.generalAccessAreas) {
    res.json(record.generalAccessAreas);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedDisplays
server.get("/userAssignedDisplays/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedDisplays").find({ id }).value();

  // If the record exists and has the userAssignedDisplays array, return just that array
  if (record && record.userAssignedDisplays) {
    res.json(record.userAssignedDisplays);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedMediapools
server.get("/userAssignedMediapools/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedMediapools").find({ id }).value();

  // If the record exists and has the userAssignedMediapools array, return just that array
  if (record && record.userAssignedMediapools) {
    res.json(record.userAssignedMediapools);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedAds
server.get("/userAssignedAds/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedAds").find({ id }).value();

  // If the record exists and has the userAssignedAds array, return just that array
  if (record && record.userAssignedAds) {
    res.json(record.userAssignedAds);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedShortPlayLists
server.get("/userAssignedShortPlayLists/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedShortPlayLists").find({ id }).value();

  // If the record exists and has the userAssignedShortPlayLists array, return just that array
  if (record && record.userAssignedShortPlayLists) {
    res.json(record.userAssignedShortPlayLists);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedPlayLists
server.get("/userAssignedPlayLists/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedPlayLists").find({ id }).value();

  // If the record exists and has the userAssignedPlayLists array, return just that array
  if (record && record.userAssignedPlayLists) {
    res.json(record.userAssignedPlayLists);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// Middleware to handle nested keys for userAssignedUsers
server.get("/userAssignedUsers/:id", (req, res) => {
  const { id } = req.params;
  const db = router.db;

  // Find the record matching the provided id
  const record = db.get("userAssignedUsers").find({ id }).value();

  // If the record exists and has the userAssignedUsers array, return just that array
  if (record && record.userAssignedUsers) {
    res.json(record.userAssignedUsers);
  } else {
    res.status(404).send({ error: `No data found for id: ${id}` });
  }
});
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

// === Support Tickets & Messages helpers ======================================
function parseIntOrDefault(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : d;
}

// function sortItems(items, sortBy, order) {
//   if (!sortBy) return items;
//   const dir = (order || "desc").toLowerCase() === "asc" ? 1 : -1;
//   return items.slice().sort((a, b) => {
//     const av = a?.[sortBy];
//     const bv = b?.[sortBy];
//     if (av === bv) return 0;
//     return av > bv ? dir : -dir;
//   });
// }

// GET /ticketsWithCount?page=1&pageSize=10&status=OPEN&category=TECHNICAL&priority=HIGH&q=login&sortBy=createdAt&order=desc
server.get("/ticketsWithCount", (req, res) => {
  const db = router.db;

  const {
    page = "1",
    pageSize = "10",
    status,
    category,
    priority,
    q, // full-text-ish search on title/description
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  let items = db.get("tickets").value() || [];

  // Filters
  if (status) items = items.filter((t) => t.status === status);
  if (category) items = items.filter((t) => t.category === category);
  if (priority) items = items.filter((t) => t.priority === priority);
  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter(
      (t) =>
        (t.title || "").toLowerCase().includes(needle) ||
        (t.description || "").toLowerCase().includes(needle)
    );
  }

  // Sort (default newest created first)
  items = sortItems(items, sortBy, order);

  const totalCount = items.length;

  // Pagination
  const pageNum = parseIntOrDefault(page, 1);
  const size = parseIntOrDefault(pageSize, 10);
  const start = (pageNum - 1) * size;
  const paged = items.slice(start, start + size);

  res.json({
    items: paged,
    totalCount,
    page: pageNum,
    pageSize: size,
  });
});

// GET /tickets/:id/withMessages
server.get("/tickets/:id/withMessages", (req, res) => {
  const db = router.db;
  const { id } = req.params;

  const ticket = db.get("tickets").find({ id }).value();
  if (!ticket) {
    return res.status(404).json({ error: `Ticket ${id} not found` });
  }

  const messages =
    db.get("messages").filter({ ticketId: id }).sortBy("timestamp").value() ||
    [];
  res.json({ ...ticket, messages });
});

// GET /tickets/:id/messages?limit=20&page=1
server.get("/tickets/:id/messages", (req, res) => {
  const db = router.db;
  const { id } = req.params;
  const { page = "1", limit = "20" } = req.query;

  // Check ticket existence (optional but nice)
  const ticketExists = db.get("tickets").find({ id }).value();
  if (!ticketExists) {
    return res.status(404).json({ error: `Ticket ${id} not found` });
  }

  let msgs =
    db.get("messages").filter({ ticketId: id }).sortBy("timestamp").value() ||
    [];
  const totalCount = msgs.length;

  const pageNum = parseIntOrDefault(page, 1);
  const size = parseIntOrDefault(limit, 20);
  const start = (pageNum - 1) * size;
  msgs = msgs.slice(start, start + size);

  res.json({
    ticketId: id,
    messages: msgs,
    totalCount,
    page: pageNum,
    pageSize: size,
  });
});
///////////////////////////////////////////////////////////////////////////////////////
// notificationCenter Messages

const isIsoDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);

const normalizeForSort = (val) => {
  if (val == null) return "";
  if (typeof val === "number") return val;
  if (isIsoDate(val)) return new Date(val).getTime();
  if (val instanceof Date) return val.getTime();
  return String(val).toLowerCase();
};

const sortItems = (items, sortBy = "createdAt", order = "desc") => {
  const dir = order === "asc" || order === "asce" ? 1 : -1;
  return items.slice().sort((a, b) => {
    const av = normalizeForSort(a?.[sortBy]);
    const bv = normalizeForSort(b?.[sortBy]);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
};

// ---------- MESSAGES LIST WITH COUNT ----------
// GET /messagesWithCount?page=1&pageSize=10&category=GENERAL,ALERT&isSeen=SEEN&isArchived=ARCHIVED&q=password&sortBy=createdAt&order=desc
server.get("/messagesWithCount", (req, res) => {
  const db = router.db;

  const {
    page = "1",
    pageSize = "10",
    category, // e.g. "TASK,ALERT"
    isSeen, // "SEEN" | "UNSEEN" | "SEEN,UNSEEN"
    isArchived, // "ARCHIVED" | "UN-ARCHIVED" | "ARCHIVED,UN-ARCHIVED"
    q, // free text (alias for "message")
    message, // also accepted (from your URL builder)
    sortBy = "createdAt",
    order = "desc",
    from, // optional: YYYY-MM-DD or ISO (rangeTime[0])
    to, // optional: YYYY-MM-DD or ISO (rangeTime[1])
  } = req.query;

  const needle = String(q ?? message ?? "")
    .trim()
    .toLowerCase();
  const catSet = category
    ? new Set(
        String(category)
          .split(",")
          .map((s) => s.trim())
      )
    : null;

  const seenSet = isSeen
    ? new Set(
        String(isSeen)
          .split(",")
          .map((s) => s.trim().toUpperCase())
      )
    : null; // SEEN / UNSEEN

  const archSet = isArchived
    ? new Set(
        String(isArchived)
          .split(",")
          .map((s) => s.trim().toUpperCase())
      )
    : null; // ARCHIVED / UN-ARCHIVED

  const fromTs = from ? new Date(from).getTime() : null;
  const toTs = to ? new Date(to).getTime() : null;

  const comments = db.get("internalMessageComments").value() || [];
  let items = db.get("internalMessages").value() || [];

  // Filters
  if (catSet && catSet.size) {
    items = items.filter((m) => catSet.has(m.category));
  }

  if (seenSet && !seenSet.has("SEEN") && !seenSet.has("UNSEEN")) {
    // no-op if both present or invalid
  } else if (seenSet && !(seenSet.has("SEEN") && seenSet.has("UNSEEN"))) {
    const wantSeen = seenSet.has("SEEN");
    items = items.filter((m) => !!m.isSeen === wantSeen);
  }

  if (archSet && !archSet.has("ARCHIVED") && !archSet.has("UN-ARCHIVED")) {
    // no-op
  } else if (
    archSet &&
    !(archSet.has("ARCHIVED") && archSet.has("UN-ARCHIVED"))
  ) {
    const wantArchived = archSet.has("ARCHIVED");
    items = items.filter((m) => !!m.isArchived === wantArchived);
  }

  if (fromTs || toTs) {
    items = items.filter((m) => {
      const ts = new Date(m.createdAt).getTime();
      if (Number.isNaN(ts)) return false;
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    });
  }

  if (needle) {
    // match createdBy / createdByLabel OR any comment text for that message
    items = items.filter((m) => {
      const inRoot =
        (m.createdByLabel || "").toLowerCase().includes(needle) ||
        (m.createdBy || "").toLowerCase().includes(needle);
      if (inRoot) return true;
      const hasInComments = comments.some(
        (c) =>
          c.messageId === m.id &&
          (c.message || "").toLowerCase().includes(needle)
      );
      return hasInComments;
    });
  }

  // Sort & paginate
  items = sortItems(items, String(sortBy), String(order));
  const totalCount = items.length;

  const pageNum = parseIntOrDefault(page, 1);
  const size = parseIntOrDefault(pageSize, 10);
  const start = (pageNum - 1) * size;
  const paged = items.slice(start, start + size);

  res.json({
    items: paged,
    totalCount,
    page: pageNum,
    pageSize: size,
  });
});

// ---------- MESSAGE WITH COMMENTS ----------
// GET /messages/:id/withComments
server.get("/messages/:id/withComments", (req, res) => {
  const db = router.db;
  const { id } = req.params;

  const msg = db.get("internalMessages").find({ id }).value();
  if (!msg) return res.status(404).json({ error: `Message ${id} not found` });

  const comments =
    db
      .get("internalMessageComments")
      .filter({ messageId: id })
      .sortBy("timestamp")
      .value() || [];

  res.json({ ...msg, comments });
});

// ---------- COMMENTS (PAGINATED) ----------
// GET /messages/:id/comments?limit=20&page=1
server.get("/messages/:id/comments", (req, res) => {
  const db = router.db;
  const { id } = req.params;
  const { page = "1", limit = "20" } = req.query;

  const msgExists = db.get("internalMessages").find({ id }).value();
  if (!msgExists) {
    return res.status(404).json({ error: `Message ${id} not found` });
  }

  let rows =
    db
      .get("internalMessageComments")
      .filter({ messageId: id })
      .sortBy("timestamp")
      .value() || [];

  const totalCount = rows.length;
  const pageNum = parseIntOrDefault(page, 1);
  const size = parseIntOrDefault(limit, 20);
  const start = (pageNum - 1) * size;
  rows = rows.slice(start, start + size);

  res.json({
    messageId: id,
    comments: rows,
    totalCount,
    page: pageNum,
    pageSize: size,
  });
});

// ---------- DELETE MESSAGE (and its comments) ----------
// DELETE /messages/delete/:id
server.delete("/messages/delete/:id", (req, res) => {
  const db = router.db;
  const { id } = req.params;

  const exists = db.get("internalMessages").find({ id }).value();
  if (!exists)
    return res.status(404).json({ error: `Message ${id} not found` });

  db.get("internalMessages").remove({ id }).write();
  db.get("internalMessageComments").remove({ messageId: id }).write();

  res.status(204).end();
});

// ---------- ARCHIVE / UNARCHIVE ----------
// PATCH /messages/archive/:id   (toggles by default; or set explicitly with body { isArchived: boolean })
server.patch("/messages/archive/:id", (req, res) => {
  const db = router.db;
  const { id } = req.params;

  const row = db.get("internalMessages").find({ id }).value();
  if (!row) return res.status(404).json({ error: `Message ${id} not found` });

  const next =
    typeof req.body?.isArchived === "boolean"
      ? !!req.body.isArchived
      : !row.isArchived;

  const updated = db
    .get("internalMessages")
    .find({ id })
    .assign({ isArchived: next, updatedAt: new Date().toISOString() })
    .write();

  res.json(updated);
});

// ////////////////////////////////////////////////////////////////////////////////////

// POST /tickets/:id/messages
// body: { sender: "user_123", message: "text..." }
// auto-fills id, ticketId, timestamp (ISO)
server.post("/tickets/:id/messages", express.json(), (req, res) => {
  const db = router.db;
  const { id } = req.params;
  const { sender, message, timestamp } = req.body || {};

  const ticket = db.get("tickets").find({ id }).value();
  if (!ticket) {
    return res.status(404).json({ error: `Ticket ${id} not found` });
  }
  if (!sender || !message) {
    return res.status(400).json({ error: "sender and message are required" });
  }

  const msgId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const msg = {
    id: msgId,
    ticketId: id,
    sender,
    message,
    timestamp: timestamp || new Date().toISOString(),
  };

  // Ensure messages collection exists
  if (!db.has("messages").value()) {
    db.set("messages", []).write();
  }

  db.get("messages").push(msg).write();
  res.status(201).json(msg);
});
// ========== NOTIFICATIONS (mock) =============================================

const normForSort = (val) => {
  if (val == null) return "";
  if (typeof val === "number") return val;
  if (isIsoDate(val)) return new Date(val).getTime();
  if (val instanceof Date) return val.getTime();
  return String(val).toLowerCase();
};

const sortGeneric = (items, sortBy = "date", order = "desc") => {
  const dir = order === "asc" || order === "asce" ? 1 : -1;
  return items.slice().sort((a, b) => {
    const av = normForSort(a?.[sortBy]);
    const bv = normForSort(b?.[sortBy]);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
};

const toSetOrNull = (v) =>
  v
    ? new Set(
        String(v)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null;

/**
 * GET /notificationsWithCount
 * Query:
 *  - page, pageSize
 *  - type: "SYSTEM,COMPANY,PERSONAL"
 *  - category: comma list (use your generalized: SYSTEM,ALERT,INFO,SOCIAL,OTHER or granular if you still serve them)
 *  - isSeen: "SEEN" | "UNSEEN" | "SEEN,UNSEEN"
 *  - q: free text in title/description
 *  - from, to: date range (ISO or YYYY-MM-DD)
 *  - sortBy: "date" | "title" | "type" | "category" | "isSeen"
 *  - order: "asc" | "asce" | "desc"
 */
server.get("/notificationsWithCount", (req, res) => {
  const db = router.db;
  const {
    page = "1",
    pageSize = "10",
    type,
    category,
    isSeen,
    q,
    from,
    to,
    sortBy = "date",
    order = "desc",
  } = req.query;

  let items = db.get("notifications").value() || [];
  const typeSet = toSetOrNull(type);
  const catSet = toSetOrNull(category);
  const seenSet = toSetOrNull(String(isSeen || "").toUpperCase());

  // Filters
  if (typeSet && typeSet.size) items = items.filter((n) => typeSet.has(n.type));
  if (catSet && catSet.size)
    items = items.filter((n) => catSet.has(n.category));

  if (seenSet && !(seenSet.has("SEEN") && seenSet.has("UNSEEN"))) {
    const wantSeen = seenSet.has("SEEN");
    items = items.filter((n) => !!n.isSeen === wantSeen);
  }

  if (from || to) {
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() : null;
    items = items.filter((n) => {
      const ts = new Date(n.date).getTime();
      if (Number.isNaN(ts)) return false;
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    });
  }

  if (q) {
    const needle = String(q).toLowerCase().trim();
    if (needle) {
      items = items.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(needle) ||
          (n.description || "").toLowerCase().includes(needle)
      );
    }
  }

  // Sort & paginate
  items = sortGeneric(items, String(sortBy), String(order));
  const totalCount = items.length;

  const pageNum = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 10;
  const start = (pageNum - 1) * size;
  const paged = items.slice(start, start + size);

  res.json({
    items: paged,
    totalCount,
    page: pageNum,
    pageSize: size,
  });
});

/**
 * GET /notifications/:id
 */
server.get("/notifications/:id", (req, res) => {
  const db = router.db;
  const { id } = req.params;
  const row = db.get("notifications").find({ id }).value();
  if (!row)
    return res.status(404).json({ error: `Notification ${id} not found` });
  res.json(row);
});

/**
 * PATCH /notifications/seen/:id
 *  - Marks a notification as read (isSeen: true)
 *  - Optional body: { isSeen: boolean } if you want to toggle explicitly
 */
server.patch("/notifications/seen/:id", express.json(), (req, res) => {
  const db = router.db;
  const { id } = req.params;

  const row = db.get("notifications").find({ id }).value();
  if (!row)
    return res.status(404).json({ error: `Notification ${id} not found` });

  const next = typeof req.body?.isSeen === "boolean" ? !!req.body.isSeen : true;

  const updated = db
    .get("notifications")
    .find({ id })
    .assign({ isSeen: next, updatedAt: new Date().toISOString() })
    .write();

  res.json(updated);
});
// Use JSON Server's auto-generated endpoints from db.json
server.use(router);

const app = express();
app.use(server);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/`);
});
