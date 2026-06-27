const jsonServer = require("json-server");
const express = require("express");

const delayMiddleware = require("./src/middleware/delay");
const { upload, uploadDir } = require("./src/middleware/upload");
const registerUploadRoutes = require("./src/routes/upload");
const registerNestedDataRoutes = require("./src/routes/nestedData");
const registerTicketRoutes = require("./src/routes/tickets");
const registerMessageRoutes = require("./src/routes/messages");
const registerNotificationRoutes = require("./src/routes/notifications");
const registerAddOnRoutes = require("./src/routes/addOns");
const registerCartRoutes = require("./src/routes/cart");
const registerScheduleBookingRoutes = require("./src/routes/scheduleBookings");

const server = jsonServer.create();
// const router = jsonServer.router("db-2.json");
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// Use default middlewares (logger, static, cors, and no-cache)
server.use(middlewares);

// Simulate a network delay for every request (1 second)
server.use(delayMiddleware);

// Serve static files from the uploads folder
server.use("/uploads", express.static(uploadDir));

// Register all custom routes (order preserved)
registerUploadRoutes(server, router, upload);
registerNestedDataRoutes(server, router);
registerTicketRoutes(server, router);
registerMessageRoutes(server, router);
registerNotificationRoutes(server, router);
registerAddOnRoutes(server, router);
registerCartRoutes(server, router);
registerScheduleBookingRoutes(server, router);

// Use JSON Server's auto-generated endpoints from db.json
server.use(router);

const app = express();
app.use(server);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/`);
});
