const express = require("express");

const VAT_RATE = 0.19;
const BOOKING_FEE_RATE = 0.15;

/**
 * Compute stripe and booking summaries from cart items.
 */
function computeSummaries(items, walletBalance) {
  const stripeItems = items.filter((i) => i.type !== "booking");
  const bookingItems = items.filter((i) => i.type === "booking");

  let stripeSummary = null;
  if (stripeItems.length > 0) {
    let totalCreditsReceived = 0;
    let totalSavings = 0;
    let netAmount = 0;

    for (const item of stripeItems) {
      const price =
        item.type === "addOn" ? item.priceEur * (item.quantity || 1) : item.priceEur;
      netAmount += price;

      if (item.type === "credit") {
        totalCreditsReceived += item.credits + (item.bonusCredits || 0);
      }
      if (item.discount) {
        totalSavings += item.discount.originalPrice - item.discount.finalPrice;
      }
    }

    const vatAmount = parseFloat((netAmount * VAT_RATE).toFixed(2));
    const totalEur = parseFloat((netAmount + vatAmount).toFixed(2));

    stripeSummary = {
      itemCount: stripeItems.length,
      netAmountEur: parseFloat(netAmount.toFixed(2)),
      vatAmountEur: vatAmount,
      totalEur,
      totalCreditsReceived,
      totalSavings: parseFloat(totalSavings.toFixed(2)),
    };
  }

  let bookingSummary = null;
  if (bookingItems.length > 0) {
    let totalPlays = 0;
    let subtotalCredits = 0;
    let totalSavings = 0;

    for (const item of bookingItems) {
      totalPlays += item.totalPlays || 0;
      subtotalCredits += item.slotPriceTotal || 0;
      if (item.discount) {
        totalSavings += item.discount.originalPrice - item.discount.finalPrice;
      }
    }

    const bookingFeeCredits = Math.ceil(subtotalCredits * BOOKING_FEE_RATE);
    const totalCredits = subtotalCredits + bookingFeeCredits;
    const remaining = walletBalance - totalCredits;

    bookingSummary = {
      bookingCount: bookingItems.length,
      totalPlays,
      subtotalCredits,
      bookingFeeCredits,
      totalCredits,
      walletBalance,
      remainingBalance: Math.max(0, remaining),
      shortfall: remaining < 0 ? Math.abs(remaining) : 0,
      hasSufficientBalance: remaining >= 0,
      totalSavings: parseFloat(totalSavings.toFixed(2)),
    };
  }

  return { stripeItems, bookingItems, stripeSummary, bookingSummary };
}

/**
 * Build a full cart response from the stored items.
 */
function buildCartResponse(db) {
  const cartData = db.get("cart").value() || { items: [] };
  const walletData = db.get("walletBalance").value() || { totalCredits: 0 };

  const items = cartData.items || [];
  const { stripeItems, bookingItems, stripeSummary, bookingSummary } =
    computeSummaries(items, walletData.totalCredits);

  return { stripeItems, bookingItems, stripeSummary, bookingSummary };
}

/**
 * Generate a unique cart item ID.
 */
function generateId() {
  return "cart-item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

/**
 * Create a cart item from an AddCartItemRequest based on the item type.
 * Looks up related data from other db collections to build the full item shape.
 */
function createCartItem(db, request) {
  const id = generateId();
  const addedAt = new Date().toISOString();
  const validity = { isValid: true };

  switch (request.type) {
    case "subscription": {
      const tariffData = db.get("tariff").value();
      const plan = tariffData?.tariffsList?.find((t) => t.id === request.itemId);
      return {
        id,
        type: "subscription",
        addedAt,
        planId: request.itemId,
        planName: plan?.name || `Plan ${request.itemId}`,
        planLevel: plan?.level ?? 0,
        priceEur: parseFloat(plan?.price) || 0,
        billingPeriod: "monthly",
        validity,
      };
    }

    case "addOn": {
      const addOnsData = db.get("addOns").value();
      const addOn = addOnsData?.addOns?.find((a) => a.id === request.itemId);

      // Check current offers if not found in addOns (could be a bundle or flash deal)
      if (!addOn) {
        const offersData = db.get("currentOffers").value();
        const bundle = offersData?.bundles?.find((b) => b.id === request.itemId);
        if (bundle) {
          return {
            id,
            type: "addOn",
            addedAt,
            addOnId: request.itemId,
            addOnName: bundle.title,
            priceEur: bundle.bundlePrice,
            category: "bundle",
            quantity: 1,
            discount: {
              offerId: request.offerId || request.itemId,
              offerName: bundle.badge,
              discountType: "percentage",
              discountValue: bundle.discountPercent,
              originalPrice: bundle.originalPrice,
              finalPrice: bundle.bundlePrice,
            },
            validity,
          };
        }

        const flashDeal = offersData?.flashDeals?.find((d) => d.id === request.itemId);
        if (flashDeal) {
          return {
            id,
            type: "addOn",
            addedAt,
            addOnId: request.itemId,
            addOnName: flashDeal.title,
            priceEur: flashDeal.dealPrice,
            category: "flash-deal",
            quantity: 1,
            discount:
              flashDeal.originalPrice > flashDeal.dealPrice
                ? {
                    offerId: request.offerId || request.itemId,
                    offerName: flashDeal.title,
                    discountType: "customPrice",
                    discountValue: flashDeal.dealPrice,
                    originalPrice: flashDeal.originalPrice,
                    finalPrice: flashDeal.dealPrice,
                  }
                : undefined,
            validity,
          };
        }

        // Fallback for unknown add-on
        return {
          id,
          type: "addOn",
          addedAt,
          addOnId: request.itemId,
          addOnName: `Add-On ${request.itemId}`,
          priceEur: 0,
          category: "unknown",
          quantity: request.quantity || 1,
          validity,
        };
      }

      return {
        id,
        type: "addOn",
        addedAt,
        addOnId: request.itemId,
        addOnName: addOn.name,
        priceEur: addOn.price,
        category: addOn.category,
        quantity: request.quantity || 1,
        validity,
      };
    }

    case "credit": {
      const packages = db.get("creditPackages").value() || [];
      const pkg = packages.find((p) => p.id === request.itemId);

      // Check promotional offers if not in standard packages
      if (!pkg) {
        const promos = db.get("promotionalOffers").value() || [];
        const promo = promos.find((p) => p.id === request.itemId);
        if (promo) {
          return {
            id,
            type: "credit",
            addedAt,
            packageId: request.itemId,
            packageName: promo.name,
            credits: promo.baseCredits,
            bonusCredits: promo.bonusCredits || 0,
            priceEur: promo.priceEur,
            pricePerCredit: parseFloat(
              (promo.priceEur / promo.totalCredits).toFixed(4)
            ),
            discount: {
              offerId: request.offerId || request.itemId,
              offerName: promo.name,
              discountType: "percentage",
              discountValue: promo.bonusPercentage,
              originalPrice: promo.priceEur,
              finalPrice: promo.priceEur,
            },
            validity,
          };
        }
      }

      return {
        id,
        type: "credit",
        addedAt,
        packageId: request.itemId,
        packageName: pkg
          ? `${pkg.credits.toLocaleString()} Cr Package`
          : `Package ${request.itemId}`,
        credits: pkg?.credits || 0,
        bonusCredits: 0,
        priceEur: pkg?.priceEur || 0,
        pricePerCredit: pkg?.pricePerCredit || 0,
        validity,
      };
    }

    case "booking": {
      const payload = request.schedulePayload || {};
      const events = payload.events || [];

      // Estimate duration and plays from schedule
      let totalHours = 0;
      for (const ev of events) {
        const [sh, sm] = (ev.startTime || "0:0").split(":").map(Number);
        const [eh, em] = (ev.endTime || "0:0").split(":").map(Number);
        totalHours += eh + em / 60 - (sh + sm / 60);
      }
      const totalPlays = Math.round(
        totalHours * (events[0]?.playsPerHour || 4)
      );
      const durationDays = events.length || 7;

      // Look up creditsPerSlot from partner display data
      const partnerDisplays = db.get("partnerDisplays").value() || [];
      const matchedDisplay = partnerDisplays.find(
        (d) => d.id === payload.displayId
      );
      const creditsPerSlot = matchedDisplay?.creditsPerSlot || 200;
      const slotPricePerDay = creditsPerSlot;
      const slotPriceTotal = slotPricePerDay * durationDays;

      const today = new Date();
      const startDate = payload.weekAnchorISO || today.toISOString().slice(0, 10);
      const endDate = new Date(
        new Date(startDate).getTime() + (durationDays - 1) * 86400000
      )
        .toISOString()
        .slice(0, 10);

      return {
        id,
        type: "booking",
        addedAt,
        displayId: payload.displayId || "unknown",
        displayName: payload.displayName || "Unknown Display",
        displayAddress: payload.displayAddress || "",
        contentId: payload.contentId || "unknown",
        contentType: payload.contentType || "media",
        startDate,
        endDate,
        durationDays,
        playsPerHour: events[0]?.playsPerHour || 4,
        totalPlays,
        slotPricePerDay,
        slotPriceTotal,
        schedulePayload: payload,
        validity,
      };
    }

    default:
      return null;
  }
}

/**
 * Register cart routes for checkout operations.
 * @param {object} server - json-server app instance
 * @param {object} router - json-server router (for db access)
 */
module.exports = function registerCartRoutes(server, router) {
  // Parse JSON body for POST/PATCH requests
  server.use("/cart", express.json());

  // GET /cart — Fetch full cart with computed summaries
  server.get("/cart", (req, res) => {
    const db = router.db;
    const response = buildCartResponse(db);
    res.json(response);
  });

  // POST /cart/items — Add item to cart
  server.post("/cart/items", (req, res) => {
    const db = router.db;
    const request = req.body;

    if (!request || !request.type || !request.itemId) {
      return res.status(400).json({ error: "type and itemId are required" });
    }

    const cartData = db.get("cart").value() || { items: [] };

    // For subscriptions, replace any existing subscription item
    if (request.type === "subscription") {
      cartData.items = cartData.items.filter((i) => i.type !== "subscription");
    }

    const newItem = createCartItem(db, request);
    if (!newItem) {
      return res.status(400).json({ error: `Unknown item type: ${request.type}` });
    }

    cartData.items.push(newItem);
    db.set("cart", cartData).write();

    const response = buildCartResponse(db);
    response.message = "Item added to cart";
    res.status(201).json(response);
  });

  // DELETE /cart/items/:id — Remove item from cart
  server.delete("/cart/items/:id", (req, res) => {
    const db = router.db;
    const { id } = req.params;
    const cartData = db.get("cart").value() || { items: [] };

    const idx = cartData.items.findIndex((i) => i.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Cart item not found: ${id}` });
    }

    cartData.items.splice(idx, 1);
    db.set("cart", cartData).write();

    const response = buildCartResponse(db);
    response.message = "Item removed from cart";
    res.json(response);
  });

  // PATCH /cart/items/:id — Update item (e.g., quantity)
  server.patch("/cart/items/:id", (req, res) => {
    const db = router.db;
    const { id } = req.params;
    const updates = req.body;
    const cartData = db.get("cart").value() || { items: [] };

    const item = cartData.items.find((i) => i.id === id);
    if (!item) {
      return res.status(404).json({ error: `Cart item not found: ${id}` });
    }

    // Apply allowed updates
    if (updates.quantity !== undefined && item.type === "addOn") {
      item.quantity = Math.max(1, updates.quantity);
    }

    db.set("cart", cartData).write();

    const response = buildCartResponse(db);
    response.message = "Cart item updated";
    res.json(response);
  });

  // DELETE /cart — Clear entire cart
  server.delete("/cart", (req, res) => {
    const db = router.db;
    db.set("cart", { items: [] }).write();
    res.json({ success: true, message: "Cart cleared" });
  });

  // POST /cart/checkout/stripe — Process Stripe section
  server.post("/cart/checkout/stripe", (req, res) => {
    const db = router.db;
    const cartData = db.get("cart").value() || { items: [] };
    const stripeItems = cartData.items.filter((i) => i.type !== "booking");

    if (stripeItems.length === 0) {
      return res.status(400).json({ error: "No Stripe items in cart" });
    }

    const orderNumber = "ORD-" + Date.now().toString().slice(-6);
    const sessionId = "cs_mock_" + Date.now();

    // Apply credit purchases to wallet balance
    for (const item of stripeItems) {
      if (item.type === "credit") {
        const walletData = db.get("walletBalance").value();
        if (walletData) {
          walletData.purchasedCredits += item.credits + (item.bonusCredits || 0);
          walletData.totalCredits += item.credits + (item.bonusCredits || 0);
          walletData.lastUpdated = new Date().toISOString();
          db.set("walletBalance", walletData).write();
        }
      }
    }

    // Remove stripe items from cart (keep booking items)
    cartData.items = cartData.items.filter((i) => i.type === "booking");
    db.set("cart", cartData).write();

    res.json({
      sessionId,
      sessionUrl: "",
      success: true,
      orderNumber,
    });
  });

  // POST /cart/checkout/booking — Process booking section
  server.post("/cart/checkout/booking", (req, res) => {
    const db = router.db;
    const cartData = db.get("cart").value() || { items: [] };
    const bookingItems = cartData.items.filter((i) => i.type === "booking");

    if (bookingItems.length === 0) {
      return res.status(400).json({ error: "No booking items in cart" });
    }

    // Calculate total credits to deduct
    const walletData = db.get("walletBalance").value() || { totalCredits: 0 };
    let subtotalCredits = 0;
    for (const item of bookingItems) {
      subtotalCredits += item.slotPriceTotal || 0;
    }
    const bookingFeeCredits = Math.ceil(subtotalCredits * BOOKING_FEE_RATE);
    const totalCredits = subtotalCredits + bookingFeeCredits;

    if (walletData.totalCredits < totalCredits) {
      return res.status(400).json({
        error: "Insufficient credit balance",
        required: totalCredits,
        available: walletData.totalCredits,
      });
    }

    // Deduct credits from wallet
    walletData.purchasedCredits = Math.max(
      0,
      walletData.purchasedCredits - totalCredits
    );
    walletData.totalCredits = walletData.purchasedCredits + walletData.earnedCredits;
    walletData.lastUpdated = new Date().toISOString();
    db.set("walletBalance", walletData).write();

    // Build booking confirmations and write schedule records
    const scheduleBookingsData = db.get("scheduleBookings").value() || { bookings: [] };
    const bookings = bookingItems.map((item) => {
      const bookingNumber = "DS-" + Math.floor(100000 + Math.random() * 900000);
      const scheduleBookingId = "sb-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);

      // Write schedule booking record for the overview page
      scheduleBookingsData.bookings.push({
        id: scheduleBookingId,
        bookingNumber,
        title: item.schedulePayload?.title || item.displayName + " Schedule",
        displayId: item.displayId,
        displayName: item.displayName,
        displayAddress: item.displayAddress || "",
        contentId: item.contentId,
        contentType: item.contentType,
        scheduleType: "weekly",
        startDate: item.startDate,
        endDate: item.endDate,
        eventsCount: item.schedulePayload?.events?.length || 0,
        status: "active",
        paymentStatus: "paid",
        displaySource: "shared",
        creditsCharged: item.slotPriceTotal || 0,
        createdAt: new Date().toISOString(),
      });

      return {
        bookingNumber,
        status: "confirmed",
        displayName: item.displayName,
        scheduleBookingId,
      };
    });
    db.set("scheduleBookings", scheduleBookingsData).write();

    // Remove booking items from cart (keep stripe items)
    cartData.items = cartData.items.filter((i) => i.type !== "booking");
    db.set("cart", cartData).write();

    res.json({
      success: true,
      bookings,
      creditsDeducted: totalCredits,
      newBalance: walletData.totalCredits,
      confirmationEmail: "booking-confirmation@kidata.de",
    });
  });
};
