const express = require("express");
const { check } = require("express-validator");

const usersController = require("../controllers/users-controllers");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();
/*
router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name")
      .not()
      .isEmpty()
      .withMessage("Name is required")
      .isLength({ min: 1, max: 30 })
      .withMessage("Name is required with max 30 characters"),
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please enter valid email"),
    check("password")
      .not()
      .isEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6, max: 30 })
      .withMessage(
        "Password must be at least 6 characters and max 30 characters"
      ),
    check("mobileNo")
      .isNumeric()
      .isLength({ min: 10, max: 30 })
      .withMessage("Please enter a valid mobileNo"),
  ],
  usersController.signup
);
*/
router.post(
  "/login",
  [
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please enter valid email"),
    check("password")
      .not()
      .isEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6, max: 30 })
      .withMessage(
        "Password must be at least 6 characters and max 30 characters",
      ),
  ],
  usersController.login,
);

router.post("/forgotPassword", usersController.forgotPassword);

router.post("/addPublicKey", usersController.addPublicKey);

router.post("/loginBiometrics", usersController.loginBiometrics);

// router.use(checkAuth);

router.get("/", usersController.getUsers);

router.get("/manufacturerslist", usersController.getManufacturers);

router.get("/traderslist", usersController.getTraders);

router.get("/generatePayLoad", usersController.generatePayLoad);

module.exports = router;
