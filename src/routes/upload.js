const path = require("path");
const sharp = require("sharp");
const { uploadDir } = require("../middleware/upload");

/**
 * Register file upload routes.
 * @param {object} server - json-server app instance
 * @param {object} router - json-server router (for db access)
 * @param {object} upload - multer upload instance
 */
module.exports = function registerUploadRoutes(server, router, upload) {
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

    // Ensure "uploads" array exists in the split database, then push the new upload metadata
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
      return res
        .status(400)
        .json({ message: "User ID not provided in header" });
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
};
