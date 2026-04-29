const express = require("express");
const { check } = require("express-validator");

const traderController = require("../controllers/traders-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();
router.use(checkAuth);

router.get("/:pid", traderController.getTraderById);

router.get("/getAllTraders/traders", traderController.getAllTraders);

router.get("/getTraderByName/name", traderController.getTraderByName);

router.get(
  "/traderDashboardData/:pid",
  traderController.getTraderDashboardDataById
);

router.get("/manufacturer/:uid", traderController.getTradersByManufacturerId);

// router.get(
//   "/restofmanufacturers/:uid",
//   traderController.getTradersByRestOfManufacturers
// );

router.post(
  "/create",
  [
    check("title")
      .not()
      .isEmpty()
      .withMessage("Title is required")
      .isLength({ min: 1, max: 30 })
      .withMessage("Title is required with max 30 characters"),
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please enter valid email"),
    check("address")
      .not()
      .isEmpty()
      .withMessage("Address is required")
      .isLength({ min: 1, max: 300 })
      .withMessage("Address is required with max 300 characters"),
  ],
  traderController.createTrader
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
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please enter valid email"),
    check("address")
      .not()
      .isEmpty()
      .withMessage("Address is required")
      .isLength({ min: 1, max: 300 })
      .withMessage("Address is required with max 300 characters"),
  ],
  traderController.updateTrader
);

router.post(
  "/createTraderDetails",
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
  traderController.createTraderDetails
);

router.patch(
  "/updateTraderDetails/:pid",
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
  traderController.updateTraderDetails
);

router.delete("/:pid", traderController.deleteTrader);

module.exports = router;
