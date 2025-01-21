const jsonServer = require("json-server");
const express = require("express");
const server = jsonServer.create();
// const router = jsonServer.router("db-2.json");
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use((req, res, next) => {
  setTimeout(next, 1500);
});

// Middleware to handle nested keys
server.get("/sharedDisplays/:companyId", (req, res) => {
  const { companyId } = req.params;
  const db = router.db; // Access the lowdb instance
  const sharedDisplays = db.get("sharedDisplays").value(); // Get the sharedDisplays object

  if (sharedDisplays && sharedDisplays[companyId]) {
    // Return the nested displays for the given company ID
    res.json(sharedDisplays[companyId]);
  } else {
    // Return a 404 if the key doesn't exist
    res
      .status(404)
      .send({ error: `No data found for company ID: ${companyId}` });
  }
});

server.use(router);

const app = express();
app.use(server);

const PORT = 8000;
app.listen(PORT, () => {
  console.log("Server is running on http://localhost:8000/");
});
