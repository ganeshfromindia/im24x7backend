const express = require("express");

const downloadsController = require("../controllers/downloads-controllers");

const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/", downloadsController.getDownloadByFile);

module.exports = router;
