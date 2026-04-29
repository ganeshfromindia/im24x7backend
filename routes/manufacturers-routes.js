const express = require("express");
const { check } = require("express-validator");

const manufacturerController = require("../controllers/manufacturers-controllers");

const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/:pid", manufacturerController.getManufacturerById);

router.get("/user/:uid", manufacturerController.getManufacturersByUserId);

router.post(
  "/create",
  [
    check("title")
      .not()
      .isEmpty()
      .withMessage("Title is required")
      .isLength({ min: 1, max: 30 })
      .withMessage("Title is required with max 30 characters"),
    check("description")
      .not()
      .isEmpty()
      .withMessage("Description is required")
      .isLength({ min: 1, max: 300 })
      .withMessage("Description is required with max 300 characters"),
    check("address")
      .not()
      .isEmpty()
      .withMessage("Address is required")
      .isLength({ min: 1, max: 300 })
      .withMessage("Address is required with max 300 characters"),
  ],
  manufacturerController.createManufacturer
);

router.patch(
  "/:pid",
  [
    check("title")
      .not()
      .isEmpty()
      .withMessage("Title is required")
      .isLength({ min: 1, max: 30 })
      .withMessage("Title is required with max 30 characters"),
    check("description")
      .not()
      .isEmpty()
      .withMessage("Description is required")
      .isLength({ min: 1, max: 300 })
      .withMessage("Description is required with max 300 characters"),
    check("address")
      .not()
      .isEmpty()
      .withMessage("Address is required")
      .isLength({ min: 1, max: 300 })
      .withMessage("Address is required with max 300 characters"),
  ],
  manufacturerController.updateManufacturer
);

router.delete("/:pid", manufacturerController.deleteManufacturer);

module.exports = router;
