const express = require("express");

/**
 * Generate a unique booking ID.
 */
function generateBookingId() {
  return "sb-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

/**
 * Register schedule booking routes.
 * @param {object} server - json-server app instance
 * @param {object} router - json-server router (for db access)
 */
module.exports = function registerScheduleBookingRoutes(server, router) {
  server.use("/schedule-bookings", express.json());
  server.use("/schedule", express.json());

  // GET /schedule-bookings — Fetch all schedule bookings
  server.get("/schedule-bookings", (req, res) => {
    const db = router.db;
    const data = db.get("scheduleBookings").value() || { bookings: [] };
    res.json({
      bookings: data.bookings || [],
      totalCount: (data.bookings || []).length,
    });
  });

  // POST /schedule — Create a schedule booking record (own display = free)
  server.post("/schedule", (req, res) => {
    const db = router.db;
    const payload = req.body;

    const booking = {
      id: generateBookingId(),
      bookingNumber: "SCH-" + Math.floor(100000 + Math.random() * 900000),
      title: payload.title || "Untitled Schedule",
      displayId: payload.displayId || "unknown",
      displayName: payload.displayName || "Unknown Display",
      displayAddress: payload.displayAddress || "",
      contentId: payload.contentId || "unknown",
      contentType: payload.contentType || "media",
      scheduleType: payload.scheduleType || "weekly",
      startDate: payload.weekAnchorISO
        ? payload.weekAnchorISO.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      endDate: new Date(
        Date.now() + 7 * 86400000
      ).toISOString().slice(0, 10),
      eventsCount: (payload.events || []).length,
      status: "active",
      paymentStatus: "free",
      displaySource: payload.displaySource || "own",
      creditsCharged: 0,
      createdAt: new Date().toISOString(),
    };

    const data = db.get("scheduleBookings").value() || { bookings: [] };
    data.bookings.push(booking);
    db.set("scheduleBookings", data).write();

    res.status(201).json({
      message: "Schedule created.",
      booking: {
        id: booking.id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
      },
    });
  });
};
