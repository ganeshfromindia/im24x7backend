const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const { ObjectId } = require("mongodb");
const HttpError = require("../models/http-error");
const Manufacturer = require("../models/manufacturer");
const User = require("../models/user");
const rimraf = require("rimraf");
const product = require("../models/product");
const Trader = require("../models/trader");

const getManufacturerById = async (req, res, next) => {
  const loggedInUserID = req.params.pid;
  let manufacturer;
  let result = [];
  manufacturer = await Manufacturer.find({
    userId: ObjectId.createFromHexString(loggedInUserID),
  })
    .then((manufacturer) => {
      return manufacturer;
    })
    .catch((err) => {
      result.push(err);
      return res.status(403).json({ message: result });
    });

  if (!manufacturer) {
    result.push("Could not find Manufacturer details please submit it.");
    return res.status(403).json({ message: result });
  }

  res.json({
    manufacturer:
      manufacturer &&
      manufacturer.map((manufacturer, index) => ({
        ...manufacturer.toObject({ getters: true }),
      })),
  });
};

const getManufacturersByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  // let Manufacturers;
  let userWithManufacturers;
  try {
    userWithManufacturers = await User.findById(userId).populate(
      "manufacturers"
    );
  } catch (err) {
    const error = new HttpError(
      "Fetching Manufacturers failed, please try again later.",
      500
    );
    return next(error);
  }

  // if (!Manufacturers || Manufacturers.length === 0) {
  if (!userWithManufacturers) {
    res.json({
      message: "Could not find manufacturers for the provided logged in id",
    });
    return;
  }
  res.json({
    manufacturers: userWithManufacturers.toObject({ getters: true }),
    message: "success",
  });
};

const createManufacturer = async (req, res, next) => {
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
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

  let admin;
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

  const createdManufacturer = new Manufacturer({
    title,
    description,
    address,
    aadhaar,
    userId: req.userData.userId,
    admin: admin._id,
    traders: [],
    products: [],
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdManufacturer.save({ session: sess });
    admin.manufacturers.push(createdManufacturer);
    await admin.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating Manufacturer failed, please try again.",
      500
    );
    return next(error);
  }

  res
    .status(201)
    .json({ manufacturer: createdManufacturer.toObject({ getters: true }) });
};

const updateManufacturer = async (req, res, next) => {
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
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
  const manufacturerId = req.params.pid;

  let manufacturer;
  try {
    manufacturer = await Manufacturer.findById(manufacturerId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update Manufacturer.",
      500
    );
    return next(error);
  }
  if (manufacturer.userId.toString() !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to edit this Manufacturer.",
      401
    );
    return next(error);
  }

  manufacturer.title = title;
  manufacturer.description = description;
  manufacturer.address = address;
  manufacturer.aadhaar = aadhaar;

  try {
    await manufacturer.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update Manufacturer.",
      500
    );
    return next(error);
  }

  res
    .status(200)
    .json({ manufacturer: manufacturer.toObject({ getters: true }) });
};

const deleteManufacturer = async (req, res, next) => {
  const manufacturerId = req.params.pid;

  let manufacturer;
  let manufacturerUser;
  let trader;

  try {
    manufacturer = await Manufacturer.findById(manufacturerId)
      .populate("admin")
      .populate("traders")
      .populate("products")
      .populate("userId");
    manufacturerUser = await User.findOne({ email: manufacturer.userId.email });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete Manufacturer.",
      500
    );
    return next(error);
  }

  if (!manufacturer) {
    const error = new HttpError(
      "Could not find Manufacturer for this id.",
      404
    );
    return next(error);
  }

  if (!manufacturer.admin.equals(req.userData.userId)) {
    const error = new HttpError(
      "You are not allowed to delete this Manufacturer.",
      401
    );
    return next(error);
  }

  const imagePath = manufacturer.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    for (const product of manufacturer.products) {
      for (const trader of manufacturer.traders) {
        await trader.products.pull(product);
        await trader.save({ session: sess });
      }
      await product.deleteOne({ session: sess });
    }
    for (const trader of manufacturer.traders) {
      await trader.manufacturers.pull(manufacturer);
      await trader.save({ session: sess });
    }
    await manufacturer.deleteOne({ session: sess });
    await manufacturerUser.deleteOne({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Something went wrong, could not delete Manufacturer.",
      500
    );
    return next(error);
  }

  rimraf(`uploads/documents/Manufacturers/${manufacturer.userId.name}`, (err) =>
    console.log(err)
  );

  res.status(200).json({ message: "Deleted Manufacturer." });
};

exports.getManufacturerById = getManufacturerById;
exports.getManufacturersByUserId = getManufacturersByUserId;
exports.createManufacturer = createManufacturer;
exports.updateManufacturer = updateManufacturer;
exports.deleteManufacturer = deleteManufacturer;
