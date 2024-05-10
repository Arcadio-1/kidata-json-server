const jsonServer = require("json-server");
const express = require("express");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use((req, res, next) => {
  setTimeout(next, 1000);
});
server.use(router);

const app = express();
app.use(server);

const PORT = 8000;
app.listen(PORT, () => {
  console.log("Server is running on http://localhost:8000/");
});
