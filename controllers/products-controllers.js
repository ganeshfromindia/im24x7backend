const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Product = require("../models/product");
const Manufacturer = require("../models/manufacturer");
const Trader = require("../models/trader");
const rimraf = require("rimraf");
const cookie = require("../app");
const fse = require("fs-extra");

const getProductById = async (req, res, next) => {
  const productId = req.params.pid;

  let product;
  try {
    product = await Product.findById(productId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a Product.",
      500,
    );
    return next(error);
  }

  if (!product) {
    const error = new HttpError(
      "Could not find Product for the provided id.",
      404,
    );
    return next(error);
  }

  res.json({ product: product.toObject({ getters: true }) });
};

const getProductsByManufacturerId = async (req, res, next) => {
  // const storedCookie = cookie.randomNumber;
  // const clientCookie = req.get("Cookie").split("=")[1];
  // console.log(storedCookie);
  // console.log(clientCookie);
  const manufacturerId = req.query.uid;
  const categoryName = req.query.category;
  let manufacturerWithProducts;
  let totalProducts;
  let page = req.query.page;
  let size = req.query.size;

  try {
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (parseInt(page) - 1) * size;
    totalProducts = await Manufacturer.findOne({
      userId: manufacturerId,
    }).populate({
      path: "products",
      match: { category: categoryName },
    });

    manufacturerWithProducts = await Manufacturer.findOne({
      userId: manufacturerId,
    }).populate({
      path: "products",
      match: { category: categoryName },
      options: {
        limit: limit,
        sort: { title: 1 },
        skip: skip,
      },
    });
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Fetching Products failed, please try again later.",
      500,
    );
    return next(error);
  }

  if (
    !manufacturerWithProducts ||
    manufacturerWithProducts.products.length === 0
  ) {
    res.json({
      products: [],
      message: "Could not find products for the provided manufacturer id",
    });
    return;
  }
  // manufacturerWithProducts.products = manufacturerWithProducts.products.filter(
  //   (data) => data.category == categoryName
  // );
  // console.log(manufacturerWithProducts.products);
  return res.status(200).json({
    products:
      manufacturerWithProducts &&
      manufacturerWithProducts.products.map((product, index) => ({
        ...product.toObject({ getters: true }),
        serialNo: (parseInt(page) - 1) * size + index + 1,
      })),
    size: size,
    message: "success",
    total: totalProducts.products.length,
  });
};

const getProductsByTraderId = async (req, res, next) => {
  const traderId = req.query.uid;
  const category = req.query.category;
  let traderWithProducts;
  let tradersTotalProducts;
  let page = req.query.page;
  let size = req.query.size;
  try {
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (parseInt(page) - 1) * size;
    tradersTotalProducts = await Trader.findOne({
      email: req.userData.email,
    })
      .populate({
        path: "products",
        match: { category: category },
      })
      .exec();
    traderWithProducts = await Trader.findOne({
      email: req.userData.email,
    }).populate({
      path: "products",
      match: { category: category },
      options: {
        limit: limit,
        skip: skip,
      },
      populate: {
        path: "manufacturer",
      },
    });
  } catch (err) {
    const error = new HttpError(
      "Fetching Products failed, please try again later.",
      500,
    );
    return next(error);
  }

  if (!traderWithProducts || traderWithProducts.products.length === 0) {
    res.json({
      products: [],
      message: "Could not find products for the provided manufacturer id",
    });
    return;
  }

  return res.status(200).json({
    products:
      traderWithProducts &&
      traderWithProducts.products.map((product, index) => ({
        ...product.toObject({ getters: true }),
        serialNo: (parseInt(page) - 1) * size + index + 1,
      })),
    size: size,
    message: "success",
    total: tradersTotalProducts.products.length,
  });
};

const getProductsByTraderAndManufacturerId = async (req, res, next) => {
  const traderId = req.query.uid;
  const category = req.query.category;
  const manufacturerUserId = req.userData.userId;
  let traderWithProducts;
  let tradersTotalProducts;
  let page = req.query.page;
  let size = req.query.size;
  let manufacturerId;
  try {
    manufacturerId = await Manufacturer.findOne({
      userId: req.userData.userId,
    });
  } catch (err) {
    const error = new HttpError(
      "Fetching Product failed, please try again.",
      500,
    );
    return next(error);
  }

  try {
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (parseInt(page) - 1) * size;
    tradersTotalProducts = await Trader.findById(traderId)
      .populate({
        path: "products",
        match: { manufacturer: manufacturerId, category: category },
      })
      .exec();
    traderWithProducts = await Trader.findById(traderId).populate({
      path: "products",
      match: { manufacturer: manufacturerId, category: category },
      options: {
        limit: limit,
        sort: { title: 1 },
        skip: skip,
      },
    });
  } catch (err) {
    const error = new HttpError(
      "Fetching Products failed, please try again later.",
      500,
    );
    return next(error);
  }

  if (!traderWithProducts || traderWithProducts.products.length === 0) {
    res.json({
      products: [],
      message: "Could not find products for the provided manufacturer id",
    });
    return;
  }

  return res.status(200).json({
    products:
      traderWithProducts &&
      traderWithProducts.products.map((product, index) => ({
        ...product.toObject({ getters: true }),
        serialNo: (parseInt(page) - 1) * size + index + 1,
      })),
    size: size,
    message: "success",
    total: tradersTotalProducts.products.length,
  });
};

const createProduct = async (req, res, next) => {
  const {
    folder,
    title,
    description,
    price,
    impurities,
    refStandards,
    pharmacopoeias,
    traders,
    dmf,
    category,
  } = req.body;
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
  let titleError = errorData.filter((data) => data.param == "title")[0];
  let descriptionError = errorData.filter(
    (data) => data.param == "description",
  )[0];
  let priceError = errorData.filter((data) => data.param == "price")[0];
  if (titleError) {
    result.push(titleError.msg);
  }
  if (descriptionError) {
    result.push(descriptionError.msg);
  }
  if (priceError) {
    result.push(priceError.msg);
  }
  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }
  if (!errorMain.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422),
    );
  }

  let productName;
  try {
    productName = manufacturerWithProducts = await Manufacturer.findOne({
      userId: req.userData.userId,
    }).populate({
      path: "products",
      match: {
        title: req.body.title.trim(),
      },
    });
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Creating Product failed, please try again first.",
      500,
    );
    return next(error);
  }

  if (productName.length > 0) {
    const error = new HttpError("Product already exists", 404);
    return next(error);
  }

  let manufacturer;
  try {
    manufacturer = await Manufacturer.findOne({
      userId: req.userData.userId,
    });
  } catch (err) {
    const error = new HttpError(
      "Could not find manufacturer for provided id.",
      500,
    );
    return next(error);
  }

  if (!manufacturer) {
    const error = new HttpError(
      "Could not find manufacturer for provided id.",
      404,
    );
    return next(error);
  }

  const createdProduct = new Product({
    folder,
    category,
    title: title.trim(),
    description,
    price,
    image:
      (req &&
        req.files &&
        req.files.image &&
        req.files.image[0] &&
        req.files.image[0].path.replace(/\\/g, "/")) ||
      "",
    coa:
      (req &&
        req.files &&
        req.files.coa &&
        req.files.coa[0].path.replace(/\\/g, "/")) ||
      "",
    msds:
      (req &&
        req.files &&
        req.files.msds &&
        req.files.msds[0].path.replace(/\\/g, "/")) ||
      "",
    cep:
      (req &&
        req.files &&
        req.files.cep &&
        req.files.cep[0].path.replace(/\\/g, "/")) ||
      "",
    qos:
      (req &&
        req.files &&
        req.files.qos &&
        req.files.qos[0].path.replace(/\\/g, "/")) ||
      "",
    dmf,
    impurities,
    refStandards,
    pharmacopoeias,
    manufacturer: manufacturer._id,
    traders,
  });
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdProduct.save({ session: sess });
    manufacturer.products.push(createdProduct);
    await manufacturer.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Creating Product failed, please try again second.",
      500,
    );
    return next(error);
  }

  res.status(201).json({ product: createdProduct });
};

const updateProduct = async (req, res, next) => {
  let newFolder;
  let productTitle;
  let {
    folder,
    title,
    description,
    price,
    impurities,
    refStandards,
    pharmacopoeias,
    image,
    coa,
    msds,
    cep,
    qos,
    dmf,
  } = req.body;
  productTitle = title;
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
  let titleError = errorData.filter((data) => data.param == "title")[0];
  let descriptionError = errorData.filter(
    (data) => data.param == "description",
  )[0];
  let priceError = errorData.filter((data) => data.param == "price")[0];
  if (titleError) {
    result.push(titleError.msg);
  }
  if (descriptionError) {
    result.push(descriptionError.msg);
  }
  if (priceError) {
    result.push(priceError.msg);
  }
  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }
  if (!errorMain.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422),
    );
  }

  const productId = req.params.pid;

  let product;

  try {
    product = await Product.findById(productId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update Product.",
      500,
    );
    return next(error);
  }

  let productManufacturer;
  try {
    productManufacturer = await Manufacturer.findOne({
      userId: req.userData.userId,
    });
  } catch (err) {
    const error = new HttpError(
      "Updating Product failed, please try again.",
      500,
    );
    return next(error);
  }

  if (!productManufacturer) {
    const error = new HttpError(
      "Could not find manufacturer for provided product.",
      404,
    );
    return next(error);
  }
  if (product.manufacturer.toString() !== productManufacturer._id.toString()) {
    const error = new HttpError(
      "You are not allowed to edit this Product.",
      401,
    );
    return next(error);
  }

  if (product.title.trim() !== title.trim()) {
    title = title
      .trim()
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .trim();

    product.title = product.title
      .trim()
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .trim();
    if (!(req && req.files && req.files.image) && image !== "null") {
      image = image.replace(product.title, title);
    }
    if (!(req && req.files && req.files.coa) && coa !== "null") {
      coa = coa.replace(product.title, title);
    }
    if (!(req && req.files && req.files.msds) && msds !== "null") {
      msds = msds.replace(product.title, title);
    }
    if (!(req && req.files && req.files.cep) && cep !== "null") {
      cep = cep.replace(product.title, title);
    }
    if (!(req && req.files && req.files.qos) && qos !== "null") {
      qos = qos.replace(product.title, title);
    }
  }
  if (
    !req.files.image &&
    !req.files.coa &&
    !req.files.msds &&
    !req.files.cep &&
    !req.files.qos &&
    title !== product.title
  ) {
    title = title
      .trim()
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .trim();

    product.title = product.title
      .trim()
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .trim();
    if (fse.existsSync(`uploads/documents/${product.folder}`)) {
      try {
        await fse.copySync(
          `uploads/documents/${product.folder}`,
          `uploads/documents/${folder}`,
        );
        rimraf(`uploads/documents/${product.folder}`, (err) => {
          console.log(err);
        });
      } catch (err) {
        console.log(err);
      }
    }
  }

  product.folder = folder;
  product.title = productTitle;
  product.description = description;
  product.price = price;
  product.image =
    (req &&
      req.files &&
      req.files.image &&
      req.files.image[0] &&
      req.files.image[0].path.replace(/\\/g, "/")) ||
    (image !== "null" ? image : "");
  product.coa =
    (req &&
      req.files &&
      req.files.coa &&
      req.files.coa[0].path.replace(/\\/g, "/")) ||
    (coa !== "null" ? coa : "");
  product.msds =
    (req &&
      req.files &&
      req.files.msds &&
      req.files.msds[0].path.replace(/\\/g, "/")) ||
    (msds !== "null" ? msds : "");
  product.cep =
    (req &&
      req.files &&
      req.files.cep &&
      req.files.cep[0].path.replace(/\\/g, "/")) ||
    (cep !== "null" ? cep : "");
  product.qos =
    (req &&
      req.files &&
      req.files.qos &&
      req.files.qos[0].path.replace(/\\/g, "/")) ||
    (qos !== "null" ? qos : "");
  product.impurities = impurities;
  product.refStandards = refStandards;
  product.dmf = dmf;
  product.pharmacopoeias = pharmacopoeias;

  try {
    await product.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update Product.",
      500,
    );
    return next(error);
  }

  res.status(200).json({ product: product.toObject({ getters: true }) });
};

const deleteProduct = async (req, res, next) => {
  const productId = req.params.pid;

  let product;
  let productsWithTrader;
  try {
    product = await Product.findById(productId).populate({
      path: "manufacturer",
      populate: { path: "userId", model: "User" },
    });
    productsWithTrader = await Product.findById(productId).populate("traders");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete Product.",
      500,
    );
    return next(error);
  }

  if (!product) {
    const error = new HttpError("Could not find Product for this id.", 404);
    return next(error);
  }

  if (!product.manufacturer.userId.equals(req.userData.userId)) {
    const error = new HttpError(
      "You are not allowed to delete this Product.",
      401,
    );
    return next(error);
  }

  // let filesPaths = [];

  // const imagePath = product.image;
  // if (imagePath) filesPaths.push(imagePath);
  // const coaPath = product.coa;
  // if (coaPath) filesPaths.push(coaPath);
  // const msdsPath = product.msds;
  // if (msdsPath) filesPaths.push(msdsPath);
  // const cepPath = product.cep;
  // if (cepPath) filesPaths.push(cepPath);
  // const qosPath = product.qos;
  // if (qosPath) filesPaths.push(qosPath);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await product.deleteOne({ session: sess });
    await product.manufacturer.products.pull(product);
    await product.manufacturer.save({ session: sess });
    if (productsWithTrader) {
      for (const trader of productsWithTrader.traders) {
        trader.products.pull(product);
        await trader.save({ session: sess });
      }
    }
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete Product.",
      500,
    );
    return next(error);
  }

  // if (filesPaths.length > 0) {
  //   for (const path of filesPaths) {
  //     fs.unlink(path, (err) => {
  //       console.log(err);
  //     });
  //   }

  rimraf(
    `uploads/documents/Manufacturers/${product.manufacturer.userId.name}/Products/${product.title}`,
    (err) => console.log(err),
  );
  // }
  res.status(200).json({ message: "Deleted Product." });
};

const searchProductsByManufacturerId = async (req, res, next) => {
  const manufacturerId = req.query.uid;
  const searchText = req.query.search;
  const categoryName = req.query.category;

  let manufacturerWithProducts;
  let totalProducts;
  let page = req.query.page;
  let size = req.query.size;

  console.log(searchText, manufacturerId, categoryName);

  // if (!searchText) {
  //   const error = new HttpError("Search text is required.", 400);
  //   return next(error);
  // }

  try {
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (parseInt(page) - 1) * size;

    const searchRegex = new RegExp(searchText, "i");

    const matchQuery = {
      $or: [{ title: searchRegex }, { description: searchRegex }],
    };

    if (categoryName) {
      matchQuery.category = categoryName;
    }

    totalProducts = await Manufacturer.findOne({
      userId: manufacturerId,
    }).populate({
      path: "products",
      match: matchQuery,
    });

    manufacturerWithProducts = await Manufacturer.findOne({
      userId: manufacturerId,
    }).populate({
      path: "products",
      match: matchQuery,
      options: {
        limit: limit,
        sort: { title: 1 },
        skip: skip,
      },
    });
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Searching Products failed, please try again later.",
      500,
    );
    return next(error);
  }

  if (
    !manufacturerWithProducts ||
    manufacturerWithProducts.products.length === 0
  ) {
    res.json({
      products: [],
      message: "Could not find products matching the search criteria.",
    });
    return;
  }

  return res.status(200).json({
    products:
      manufacturerWithProducts &&
      manufacturerWithProducts.products.map((product, index) => ({
        ...product.toObject({ getters: true }),
        serialNo: (parseInt(page) - 1) * size + index + 1,
      })),
    size: size,
    message: "success",
    total: totalProducts.products.length,
  });
};

const searchProductsByTraderId = async (req, res, next) => {
  const searchText = req.query.search;
  const category = req.query.category;
  let traderWithProducts;
  let tradersTotalProducts;
  let page = req.query.page;
  let size = req.query.size;

  //if (!searchText) {
  //  const error = new HttpError("Search text is required.", 400);
  //  return next(error);
  //}

  try {
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (parseInt(page) - 1) * size;

    const searchRegex = new RegExp(searchText, "i");

    const matchQuery = {
      $or: [{ title: searchRegex }, { description: searchRegex }],
    };

    if (category) {
      matchQuery.category = category;
    }

    tradersTotalProducts = await Trader.findOne({
      email: req.userData.email,
    })
      .populate({
        path: "products",
        match: matchQuery,
      })
      .exec();

    traderWithProducts = await Trader.findOne({
      email: req.userData.email,
    }).populate({
      path: "products",
      match: matchQuery,
      options: {
        limit: limit,
        skip: skip,
      },
      populate: {
        path: "manufacturer",
      },
    });
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Searching Products failed, please try again later.",
      500,
    );
    return next(error);
  }

  if (!traderWithProducts || traderWithProducts.products.length === 0) {
    res.json({
      products: [],
      message: "Could not find products matching the search criteria.",
    });
    return;
  }

  return res.status(200).json({
    products:
      traderWithProducts &&
      traderWithProducts.products.map((product, index) => ({
        ...product.toObject({ getters: true }),
        serialNo: (parseInt(page) - 1) * size + index + 1,
      })),
    size: size,
    message: "success",
    total: tradersTotalProducts.products.length,
  });
};

exports.getProductById = getProductById;
exports.getProductsByManufacturerId = getProductsByManufacturerId;
exports.getProductsByTraderId = getProductsByTraderId;
exports.getProductsByTraderAndManufacturerId =
  getProductsByTraderAndManufacturerId;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.searchProductsByManufacturerId = searchProductsByManufacturerId;
exports.searchProductsByTraderId = searchProductsByTraderId;
