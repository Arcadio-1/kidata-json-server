/**
 * Register add-on routes for subscribe/cancel operations.
 * @param {object} server - json-server app instance
 * @param {object} router - json-server router (for db access)
 */
module.exports = function registerAddOnRoutes(server, router) {
  // Subscribe to an add-on
  server.post("/addOns/:id/subscribe", (req, res) => {
    const { id } = req.params;
    const db = router.db;
    const addOnsData = db.get("addOns").value();

    if (!addOnsData || !addOnsData.addOns) {
      return res.status(404).json({ error: "Add-ons data not found" });
    }

    const addOn = addOnsData.addOns.find((a) => a.id === id);
    if (!addOn) {
      return res.status(404).json({ error: `Add-on not found: ${id}` });
    }

    if (addOn.isActive) {
      return res.status(400).json({ error: "Add-on is already active" });
    }

    // Activate the add-on
    addOn.isActive = true;
    if (!addOn.tags.includes("active")) {
      addOn.tags.push("active");
    }

    // Update summary
    addOnsData.summary.activeCount += 1;
    addOnsData.summary.monthlyTotal = parseFloat(
      (addOnsData.summary.monthlyTotal + addOn.price).toFixed(2)
    );

    db.set("addOns", addOnsData).write();

    res.json({ message: "Add-on subscribed successfully", addOn });
  });

  // Cancel an add-on
  server.delete("/addOns/:id/cancel", (req, res) => {
    const { id } = req.params;
    const db = router.db;
    const addOnsData = db.get("addOns").value();

    if (!addOnsData || !addOnsData.addOns) {
      return res.status(404).json({ error: "Add-ons data not found" });
    }

    const addOn = addOnsData.addOns.find((a) => a.id === id);
    if (!addOn) {
      return res.status(404).json({ error: `Add-on not found: ${id}` });
    }

    if (!addOn.isActive) {
      return res.status(400).json({ error: "Add-on is not active" });
    }

    // Deactivate the add-on
    addOn.isActive = false;
    addOn.tags = addOn.tags.filter((t) => t !== "active");

    // Update summary
    addOnsData.summary.activeCount = Math.max(
      0,
      addOnsData.summary.activeCount - 1
    );
    addOnsData.summary.monthlyTotal = parseFloat(
      Math.max(0, addOnsData.summary.monthlyTotal - addOn.price).toFixed(2)
    );

    db.set("addOns", addOnsData).write();

    res.json({ message: "Add-on cancelled successfully", addOn });
  });
};
