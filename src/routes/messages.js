const { parseIntOrDefault, sortItems, isIsoDate } = require("../utils/pagination");

/**
 * Register internal message (notification center) routes.
 * @param {object} server - json-server app instance
 * @param {object} router - json-server router (for db access)
 */
module.exports = function registerMessageRoutes(server, router) {
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
    if (!msg)
      return res.status(404).json({ error: `Message ${id} not found` });

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
    if (!row)
      return res.status(404).json({ error: `Message ${id} not found` });

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
};
