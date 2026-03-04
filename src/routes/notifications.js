const express = require("express");
const { parseIntOrDefault, sortGeneric, toSetOrNull } = require("../utils/pagination");

/**
 * Register notification routes.
 * @param {object} server - json-server app instance
 * @param {object} router - json-server router (for db access)
 */
module.exports = function registerNotificationRoutes(server, router) {
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
    if (typeSet && typeSet.size)
      items = items.filter((n) => typeSet.has(n.type));
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
      return res
        .status(404)
        .json({ error: `Notification ${id} not found` });
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
      return res
        .status(404)
        .json({ error: `Notification ${id} not found` });

    const next =
      typeof req.body?.isSeen === "boolean" ? !!req.body.isSeen : true;

    const updated = db
      .get("notifications")
      .find({ id })
      .assign({ isSeen: next, updatedAt: new Date().toISOString() })
      .write();

    res.json(updated);
  });
};
