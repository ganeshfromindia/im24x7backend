const express = require("express");
const { check } = require("express-validator");

const productController = require("../controllers/products-controllers");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();
router.use(checkAuth);

router.get(
  "/manufacturer/id",
  productController.searchProductsByManufacturerId,
);
router.get("/trader/id", productController.searchProductsByTraderId);
router.get("/:pid", productController.getProductById);

// router.get("/manufacturer/id", productController.getProductsByManufacturerId);
// router.get("/trader/id", productController.getProductsByTraderId);
router.get(
  "/trader/manufacturer/id",
  productController.getProductsByTraderAndManufacturerId,
);

router.post(
  "/create",
  fileUpload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "coa",
      maxCount: 1,
    },
    {
      name: "msds",
      maxCount: 1,
    },
    {
      name: "cep",
      maxCount: 1,
    },
    {
      name: "qos",
      maxCount: 1,
    },
  ]),
  [
    check("description")
      .isLength({ min: 6, max: 250 })
      .withMessage(
        "Description must be at least 6 characters and max 250 characters",
      ),
    check("title")
      .not()
      .isEmpty()
      .withMessage("Title is required")
      .isLength({ min: 6, max: 100 })
      .withMessage(
        "Title must be at least 6 characters and max 100 characters",
      ),
    check("price")
      .isNumeric()
      .withMessage("Please enter a numerical price value")
      .isLength({ max: 100 })
      .withMessage("Maximum numerical price digits should be 100"),
  ],
  productController.createProduct,
);

router.patch(
  "/:pid",
  fileUpload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "coa",
      maxCount: 1,
    },
    {
      name: "msds",
      maxCount: 1,
    },
    {
      name: "cep",
      maxCount: 1,
    },
    {
      name: "qos",
      maxCount: 1,
    },
  ]),
  [
    check("description")
      .isLength({ min: 6, max: 250 })
      .withMessage(
        "Description must be at least 6 characters and max 250 characters",
      ),
    check("title")
      .not()
      .isEmpty()
      .withMessage("Title is required")
      .isLength({ min: 6, max: 100 })
      .withMessage(
        "Title must be at least 6 characters and max 100 characters",
      ),
    check("price")
      .isNumeric()
      .withMessage("Please enter a numerical price value")
      .isLength({ max: 100 })
      .withMessage("Maximum numerical price digits should be 100"),
  ],
  productController.updateProduct,
);

router.delete("/:pid", productController.deleteProduct);

module.exports = router;
