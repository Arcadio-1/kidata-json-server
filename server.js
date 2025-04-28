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

// Use JSON Server's auto-generated endpoints from db.json
server.use(router);

const app = express();
app.use(server);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}/`);
});
