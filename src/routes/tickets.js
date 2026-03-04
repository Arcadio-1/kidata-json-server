const express = require("express");
const { parseIntOrDefault, sortItems } = require("../utils/pagination");

/**
 * Register support ticket routes.
 * @param {object} server - json-server app instance
 * @param {object} router - json-server router (for db access)
 */
module.exports = function registerTicketRoutes(server, router) {
  // === Support Tickets & Messages helpers ======================================

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
      db
        .get("messages")
        .filter({ ticketId: id })
        .sortBy("timestamp")
        .value() || [];
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
      db
        .get("messages")
        .filter({ ticketId: id })
        .sortBy("timestamp")
        .value() || [];
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
      return res
        .status(400)
        .json({ error: "sender and message are required" });
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
};
