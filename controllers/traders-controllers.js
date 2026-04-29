const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const HttpError = require("../models/http-error");
const Product = require("../models/product");
const rimraf = require("rimraf");
const Trader = require("../models/trader");
const Manufacturer = require("../models/manufacturer");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const TraderDashboard = require("../models/traderDashboard");

const getAllTraders = async (req, res, next) => {
  let trader;
  let manufacturer;
  try {
    manufacturer = await Manufacturer.findOne({ userId: req.userData.userId });
  } catch (err) {
    const error = new HttpError(
      "Fetching Trader failed, please try again.",
      500
    );
    return next(error);
  }

  try {
    trader = await Trader.find({
      manufacturers: { $ne: manufacturer._id },
    }).sort({
      level: 1,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a Trader.",
      500
    );
    return next(error);
  }

  if (trader && trader.length > 0) {
    res.json({
      trader:
        trader &&
        trader.map((trader, index) => ({
          ...trader.toObject({ getters: true }),
        })),
    });
  } else {
    res.json({ trader: [] });
  }
};

const getTraderByName = async (req, res, next) => {
  const name = req.query.name;

  let trader;
  try {
    trader = await Trader.find({ title: name.trim() });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a Trader.",
      500
    );
    return next(error);
  }

  if (trader && trader.length > 0) {
    res.json({ trader: trader.toObject({ getters: true }) });
  } else {
    res.json({ trader: [] });
  }
};

const getTraderById = async (req, res, next) => {
  const traderId = req.params.pid;

  let trader;
  try {
    trader = await Trader.findById(traderId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a Trader.",
      500
    );
    return next(error);
  }

  if (!trader) {
    const error = new HttpError(
      "Could not find Trader for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ trader: trader.toObject({ getters: true }) });
};

const getTraderDashboardDataById = async (req, res, next) => {
  const traderId = req.params.pid;

  let trader;
  try {
    trader = await TraderDashboard.find({ userId: traderId });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a Trader.",
      500
    );
    return next(error);
  }

  if (!trader) {
    const error = new HttpError(
      "Could not find Trader for the provided id.",
      404
    );
    return next(error);
  }

  res.json({
    trader:
      trader &&
      trader.map((trader, index) => ({
        ...trader.toObject({ getters: true }),
      })),
  });
};

const getTradersByManufacturerId = async (req, res, next) => {
  const manufacturerId = req.params.uid;
  const category = req.query.category;
  let manufacturerWithTraders;
  let totalProducts;
  let page = req.query.page;
  let size = req.query.size;

  try {
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (parseInt(page) - 1) * size;
    totalTraders = await Manufacturer.findOne({ userId: manufacturerId })
      .populate({
        path: "traders",
        match: { category: category },
      })
      .exec();
    manufacturerWithTraders = await Manufacturer.findOne({
      userId: manufacturerId,
    }).populate({
      path: "traders",
      match: { category: category },
      options: {
        limit: limit,
        sort: { title: 1 },
        skip: skip,
      },
    });
  } catch (err) {
    const error = new HttpError(
      "Fetching Traders failed, please try again later.",
      500
    );
    return next(error);
  }

  if (
    !manufacturerWithTraders ||
    manufacturerWithTraders.traders.length === 0
  ) {
    res.json({
      traders: [],
      message: "Could not find traders for the provided manufacturer id",
    });
    return;
  }

  res.json({
    traders:
      manufacturerWithTraders &&
      manufacturerWithTraders.traders.map((trader, index) => ({
        ...trader.toObject({ getters: true }),
        serialNo: (parseInt(page) - 1) * size + index + 1,
      })),
    size: size,
    message: "success",
    total: totalTraders.traders.length,
  });
};

const createTrader = async (req, res, next) => {
  const { title, email, address, products, category } = req.body;
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
  let existingTrader;
  let hashedPassword;
  let password;
  let titleError = errorData.filter((data) => data.param == "title")[0];
  let emailError = errorData.filter((data) => data.param == "email")[0];
  let addressError = errorData.filter((data) => data.param == "address")[0];
  if (titleError) {
    result.push(titleError.msg);
  }
  if (emailError) {
    result.push(emailError.msg);
  }
  if (addressError) {
    result.push(addressError.msg);
  }
  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }
  if (!errorMain.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }
  let traderName;
  try {
    traderName = await Trader.findOne({ email: req.body.email.trim() });
  } catch (err) {
    const error = new HttpError(
      "Creating Trader failed first , please try again.",
      500
    );

    return next(error);
  }

  if (traderName) {
    const error = new HttpError("Trader already exists", 404);
    return next(error);
  }

  let manufacturer;
  try {
    manufacturer = await Manufacturer.findOne({ userId: req.userData.userId });
  } catch (err) {
    const error = new HttpError(
      "Creating Trader failed second, please try again.",
      500
    );
    return next(error);
  }

  if (!manufacturer) {
    const error = new HttpError(
      "Could not find manufacturer for provided id.",
      404
    );
    return next(error);
  }
  await User.findOne({ email: email })
    .then((user) => {
      existingTrader = user;
    })
    .catch((err) => {
      result.push(err);
      return res.status(403).json({ message: result });
    });
  if (existingTrader) {
    result.push(
      "Trader exists already for this email id, please enter another email id."
    );
  }

  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }

  password = title + "1234";
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create user, please try again.",
      500
    );
    return next(error);
  }

  const createdTrader = new Trader({
    title: title.trim(),
    email,
    address,
    products: products,
  });

  createdTrader.manufacturers.push(manufacturer._id);
  createdTrader.category.push(category);

  const createdUser = new User({
    name: title.trim(),
    email: email,
    mobileNo: "1234567890",
    image: "",
    password: hashedPassword,
    role: "Trader",
    folder: "",
    manufacturers: [],
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdTrader.save({ session: sess });
    await createdUser.save({ session: sess });
    manufacturer.traders.push(createdTrader);
    await manufacturer.save({ session: sess });
    if (products && products.length > 0) {
      for (const product of products) {
        currentProduct = await Product.findById(product);
        currentProduct.traders.push(createdTrader);
        await currentProduct.save({ session: sess });
      }
    }
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating Trader third failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ trader: createdTrader, password: title + "1234" });
};

const updateTrader = async (req, res, next) => {
  const { title, email, address, products } = req.body;

  const traderId = req.params.pid;
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
  let newProductsArray = [];
  let newProductsWithTrader;
  let removedProductsWithTrader;
  let oldProductsWithTrader;
  let JProducts;
  let tradersOfManufacturer;
  let trader;
  let isExistingTrader;
  let isExistingManufacturer;
  let titleError = errorData.filter((data) => data.param == "title")[0];
  let emailError = errorData.filter((data) => data.param == "email")[0];
  let addressError = errorData.filter((data) => data.param == "address")[0];
  if (titleError) {
    result.push(titleError.msg);
  }
  if (emailError) {
    result.push(emailError.msg);
  }
  if (addressError) {
    result.push(addressError.msg);
  }
  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }
  if (!errorMain.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  try {
    tradersOfManufacturer = await Manufacturer.findOne({
      userId: req.userData.userId,
    });
  } catch (err) {
    const error = new HttpError(
      "Updating Trader failed, please try again.",
      500
    );
    return next(error);
  }

  if (!tradersOfManufacturer) {
    const error = new HttpError(
      "Could not find manufacturer for provided trader.",
      404
    );
    return next(error);
  }

  let productsWithTrader = await Trader.findById(traderId).populate({
    path: "products",
    match: { manufacturer: tradersOfManufacturer._id },
  });

  try {
    trader = await Trader.findById(traderId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update Trader.",
      500
    );
    return next(error);
  }

  // if (trader.manufacturers.toString() !== tradersOfManufacturer._id.toString()) {
  //   const error = new HttpError(
  //     "You are not allowed to edit this Trader.",
  //     401
  //   );
  //   return next(error);
  // }

  // if (trader.title !== title) {
  //   rimraf(
  //     `uploads/documents/Manufacturers/${req.userData.userName}/Traders/${trader.title}`,
  //     (err) => console.log(err)
  //   );
  // }
  trader.title = title;
  trader.email = email;
  trader.address = address;
  productsWithTrader = productsWithTrader.products.map((product) =>
    product._id.toString()
  );

  if (products.length > 0) {
    newProductsArray = products.filter(
      (product) => !productsWithTrader.includes(product)
    );
  }

  trader.products.push(...newProductsArray);

  isExistingManufacturer = trader.manufacturers.filter(
    (data) => data.toString() === tradersOfManufacturer._id.toString()
  );

  if (isExistingManufacturer.length === 0) {
    trader.manufacturers.push(tradersOfManufacturer);
  }

  isExistingTrader = tradersOfManufacturer.traders.filter(
    (data) => data._id.toString() === traderId
  );

  if (isExistingTrader.length === 0) {
    tradersOfManufacturer.traders.push(trader);
  }

  JProducts = products;

  newProductsWithTrader = JProducts.filter(
    (product) => !productsWithTrader.includes(product)
  );
  removedProductsWithTrader = productsWithTrader.filter(
    (product) => !JProducts.includes(product.toString())
  );
  oldProductsWithTrader = JProducts.filter((product) =>
    productsWithTrader.includes(product)
  );

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await trader.save({ session: sess });
    for (const product of newProductsWithTrader) {
      currentProduct = await Product.findById(product);
      currentProduct.traders.push(trader);
      await currentProduct.save({ session: sess });
    }
    for (const product of removedProductsWithTrader) {
      currentProduct = await Product.findById(product);
      currentProduct.traders.pull(trader);
      trader.products.pull(currentProduct);
      await currentProduct.save({ session: sess });
    }
    await trader.save({ session: sess });
    await tradersOfManufacturer.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Something went wrong, could not update Trader.",
      500
    );
    return next(error);
  }
  res.status(200).json({ trader: trader.toObject({ getters: true }) });
};

const createTraderDetails = async (req, res, next) => {
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
  let admin;
  let currentTrader;
  let titleError = errorData.filter((data) => data.param == "title")[0];
  let descriptionError = errorData.filter(
    (data) => data.param == "description"
  )[0];
  let addressError = errorData.filter((data) => data.param == "address")[0];
  if (titleError) {
    let titleValue = /^\S+@\S+\.\S+$/.test(titleError.value);
    if (titleValue.length == 0 || titleValue.length > 30) {
      result.push("Title cannot be blank or greater than 30 characters");
    }
  }
  if (descriptionError) {
    let descriptionValue = descriptionError.value;
    if (descriptionValue.length == 0 || descriptionValue.length > 300) {
      result.push("Description cannot be blank or greater than 300 characters");
    }
  }
  if (addressError) {
    let addressValue = addressError.value;
    if (addressValue.length == 0 || addressValue.length > 300) {
      result.push("Address cannot be blank or greater than 300 characters");
    }
  }
  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }
  if (!errorMain.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address, aadhaar } = req.body;

  try {
    admin = await User.findOne({ email: "admin@goodsinfoportal.com" });
  } catch (err) {
    const error = new HttpError(
      "Creating Manufacturer failed, please try again.",
      500
    );
    return next(error);
  }

  if (!admin) {
    const error = new HttpError("Could not find admin for provided id.", 404);
    return next(error);
  }
  try {
    currentTrader = await Trader.findOne({ email: req.userData.email });
  } catch (err) {
    const error = new HttpError(
      "Creating Trader Dashboard failed, please try again.",
      500
    );
    return next(error);
  }

  if (!currentTrader) {
    const error = new HttpError(
      "Could not find trader for provided email id.",
      404
    );
    return next(error);
  }

  const createdTraderDashboard = new TraderDashboard({
    title,
    description,
    address,
    aadhaar,
    userId: req.userData.userId,
    admin: admin._id,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdTraderDashboard.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating Manufacturer failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({
    traderDashboard: createdTraderDashboard.toObject({ getters: true }),
  });
};

const updateTraderDetails = async (req, res, next) => {
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
  let traderDashboard;
  let titleError = errorData.filter((data) => data.param == "title")[0];
  let descriptionError = errorData.filter(
    (data) => data.param == "description"
  )[0];
  let addressError = errorData.filter((data) => data.param == "address")[0];
  if (titleError) {
    let titleValue = /^\S+@\S+\.\S+$/.test(titleError.value);
    if (titleValue.length == 0 || titleValue.length > 30) {
      result.push("Title cannot be blank or greater than 30 characters");
    }
  }
  if (descriptionError) {
    let descriptionValue = descriptionError.value;
    if (descriptionValue.length == 0 || descriptionValue.length > 300) {
      result.push("Description cannot be blank or greater than 300 characters");
    }
  }
  if (addressError) {
    let addressValue = addressError.value;
    if (addressValue.length == 0 || addressValue.length > 300) {
      result.push("Address cannot be blank or greater than 300 characters");
    }
  }
  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }
  if (!errorMain.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description, address, aadhaar } = req.body;
  const traderId = req.params.pid;

  try {
    traderDashboard = await TraderDashboard.findById(traderId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update Manufacturer.",
      500
    );
    return next(error);
  }
  if (traderDashboard.userId.toString() !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to edit this Manufacturer.",
      401
    );
    return next(error);
  }

  traderDashboard.title = title;
  traderDashboard.description = description;
  traderDashboard.address = address;
  traderDashboard.aadhaar = aadhaar;

  try {
    await traderDashboard.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update Manufacturer.",
      500
    );
    return next(error);
  }

  res
    .status(200)
    .json({ traderDashboard: traderDashboard.toObject({ getters: true }) });
};

const deleteTrader = async (req, res, next) => {
  const traderId = req.params.pid;
  // const manufacturerEmail = req.userData.email;

  let trader;
  let traderP;
  let traderDashboard;
  let traderUser;
  let isAuthorisedManufacturer;
  let manufacturer;
  try {
    trader = await Trader.findById(traderId).populate("manufacturers");
    manufacturer = await Manufacturer.findOne({ userId: req.userData.userId });
    traderP = await Trader.findById(traderId).populate({
      path: "products",
      match: { manufacturer: manufacturer._id },
    });
    traderUser = await User.findOne({ email: trader.email });
    traderDashboard = await TraderDashboard.findOne({
      userId: traderUser._id,
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete Trader.",
      500
    );
    return next(error);
  }

  if (!trader) {
    const error = new HttpError("Could not find Trader for this id.", 404);
    return next(error);
  }

  isAuthorisedManufacturer = trader.manufacturers.filter(
    (data) => req.userData.userId == data.userId.toString()
  );

  if (!isAuthorisedManufacturer) {
    const error = new HttpError(
      "You are not allowed to delete this Trader.",
      401
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await manufacturer.traders.pull(trader);
    await manufacturer.save({ session: sess });
    trader.manufacturers.pull({ _id: manufacturer._id });
    await trader.save({ session: sess });
    for (const product of traderP.products) {
      product.traders.pull(trader);
      await product.save({ session: sess });
      trader.products.pull({ _id: product._id });
      await trader.save({ session: sess });
    }
    if (trader.manufacturers.length === 0) {
      await trader.deleteOne({ session: sess });
      if (traderDashboard) {
        await traderDashboard.deleteOne({ session: sess });
      }
      await traderUser.deleteOne({ session: sess });
    }

    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete Trader.",
      500
    );
    return next(error);
  }

  rimraf(
    `uploads/documents/Manufacturers/${req.userData.userName}/Traders/${traderUser.name}`,
    (err) => console.log(err)
  );
  res.status(200).json({ message: "Deleted Trader." });
};

exports.getAllTraders = getAllTraders;
exports.getTraderByName = getTraderByName;
exports.getTraderById = getTraderById;
exports.getTraderDashboardDataById = getTraderDashboardDataById;
exports.getTradersByManufacturerId = getTradersByManufacturerId;
exports.createTrader = createTrader;
exports.updateTrader = updateTrader;
exports.createTraderDetails = createTraderDetails;
exports.updateTraderDetails = updateTraderDetails;
exports.deleteTrader = deleteTrader;
