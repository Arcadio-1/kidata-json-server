/**
 * Register nested data lookup routes.
 * These endpoints retrieve nested properties from json-server collections
 * by a dynamic key (companyId or id).
 *
 * @param {object} server - json-server app instance
 * @param {object} router - json-server router (for db access)
 */
module.exports = function registerNestedDataRoutes(server, router) {
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
};
