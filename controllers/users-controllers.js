const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const buffer = require("buffer");

const HttpError = require("../models/http-error");
const User = require("../models/user");
const Manufacturer = require("../models/manufacturer");
const Apppublickey = require("../models/apppublickey");
const Trader = require("../models/trader");
const traderDashboard = require("../models/traderDashboard");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500,
    );
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const getManufacturers = async (req, res, next) => {
  let manufacturers;
  let manufacturersAll;
  let page = req.query.page;
  let size = req.query.size;
  try {
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (parseInt(page) - 1) * size;
    manufacturersAll = await Manufacturer.find();
    manufacturers = await Manufacturer.find()
      .skip(skip)
      .limit(limit)
      .sort({ title: 1 });
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Fetching manufacturers failed, please try again later.",
      500,
    );
    return next(error);
  }
  if (!manufacturers || manufacturers.length === 0) {
    res.json({
      products: [],
      message: "Could not find products for the provided manufacturer id",
    });
    return;
  }
  return res.status(200).json({
    manufacturers:
      manufacturers &&
      manufacturers.map((manufacturer, index) => ({
        ...manufacturer.toObject({ getters: true }),
        serialNo: (parseInt(page) - 1) * size + index + 1,
      })),
    size: size,
    message: "success",
    total: manufacturersAll.length,
  });
};
const getTraders = async (req, res, next) => {
  let traders;
  let tradersAll;
  let page = req.query.page;
  let size = req.query.size;
  try {
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (parseInt(page) - 1) * size;
    tradersAll = await Trader.find();
    traders = await Trader.find().skip(skip).limit(limit).sort({ title: 1 });
  } catch (err) {
    const error = new HttpError(
      "Fetching traders failed, please try again later.",
      500,
    );
    return next(error);
  }
  if (!traders || traders.length === 0) {
    res.json({
      products: [],
      message: "Could not find products for the provided manufacturer id",
    });
    return;
  }
  return res.status(200).json({
    traders:
      traders &&
      traders.map((trader, index) => ({
        ...trader.toObject({ getters: true }),
        serialNo: (parseInt(page) - 1) * size + index + 1,
      })),
    size: size,
    message: "success",
    total: tradersAll.length,
  });
};

const signup = async (req, res, next) => {
  // let role = req && req.body && req.body.role;
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
  let emailError = errorData.filter((data) => data.param == "email")[0];
  let usernameError = errorData.filter((data) => data.param == "name")[0];
  let mobileNoError = errorData.filter((data) => data.param == "mobileNo")[0];
  let passwordError = errorData.filter((data) => data.param == "password")[0];
  if (emailError) {
    result.push(emailError.msg);
  }
  if (usernameError) {
    result.push(usernameError.msg);
  }
  if (mobileNoError) {
    result.push(mobileNoError.msg);
  }
  if (passwordError) {
    result.push(passwordError.msg);
  }
  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }
  if (!errorMain.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422),
    );
  }

  const { name, email, mobileNo, password, folder } = req.body;

  let existingUser;

  await User.findOne({ email: email })
    .then((user) => {
      existingUser = user;
    })
    .catch((err) => {
      result.push(err);
      return res.status(403).json({ message: result });
    });
  if (existingUser && existingUser.role !== "Trader") {
    result.push("User exists already, please login instead.");
  }

  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create user, please try again.",
      500,
    );
    return next(error);
  }

  // role = role == "Manufacturer" ? "Trader" : "Manufacturer";
  let role = "Manufacturer";
  const createdUser = new User({
    name,
    email,
    mobileNo,
    image: req.file.path,
    password: hashedPassword,
    role: role,
    folder,
    manufacturers: [],
  });

  let savedUser;

  await createdUser
    .save()
    .then((user) => {
      savedUser = user;
    })
    .catch((err) => {
      result.push(err);
      return res.status(403).json({ message: result });
    });

  let token;
  try {
    token = jwt.sign(
      {
        userId: savedUser.id,
        email: savedUser.email,
        mobileNo: savedUser.mobileNo,
        role: savedUser.role,
        userName: savedUser.name,
        image: savedUser.image,
      },
      "[,ZCqF0B8Zwwm?Q_f5-D<X3]PHtpLUSi",
      { expiresIn: "1d" },
    );
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500,
    );
    return next(error);
  }

  return res.status(201).json({
    userId: savedUser.id,
    email: savedUser.email,
    mobileNo: savedUser.mobileNo,
    token: token,
    name: savedUser.name,
    role: savedUser.role,
    image: savedUser.image,
  });
};

const login = async (req, res, next) => {
  console.log("test");
  const { email, password } = req.body;
  const errorMain = validationResult(req);
  const errorData = validationResult(req).errors;
  let result = [];
  let emailError = errorData.filter((data) => data.param == "email")[0];
  let passwordError = errorData.filter((data) => data.param == "password")[0];
  if (emailError) {
    result.push(emailError.msg);
  }
  if (passwordError) {
    result.push(passwordError.msg);
  }
  if (result.length > 0) {
    return res.status(422).json({ message: result });
  }
  if (!errorMain.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422),
    );
  }
  let existingUser;
  await User.findOne({ email: email })
    .then((user) => {
      existingUser = user;
    })
    .catch((err) => {
      result.push(err);
      return res.status(403).json({ message: result });
    });
  if (!existingUser) {
    result.push("Invalid credentials, could not log you in.");
    return res.status(403).json({ message: result });
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    result.push("Invalid credentials, could not log you in.");
    return res.status(403).json({ message: result });
  }

  if (!isValidPassword) {
    result.push("Invalid credentials, could not log you in.");
    return res.status(403).json({ message: result });
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
        mobileNo: existingUser.mobileNo,
        userName: existingUser.name,
        role: existingUser.role,
        image: existingUser.image,
      },
      "[,ZCqF0B8Zwwm?Q_f5-D<X3]PHtpLUSi",
      { expiresIn: "1d" },
    );
  } catch (err) {
    result.push("Logging in failed, please try again later.");
    return res.status(403).json({ message: result });
  }

  // res.cookie("loggedIn", cookie.randomNumber, { hostOnly: true }).json({
  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    mobileNo: existingUser.mobileNo,
    token: token,
    name: existingUser.name,
    role: existingUser.role,
    image: existingUser.image,
  });
};

const forgotPassword = async (req, res, next) => {
  const { email, aadhaar } = req.body;
  let trader;
  let aadhharNo;
  let hashedPassword;
  let existingTrader;
  try {
    trader = await Trader.findOne({ email: email.trim() });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a Trader.",
      500,
    );
    return next(error);
  }

  try {
    aadhharNo = await traderDashboard.findOne({ aadhaar: aadhaar.trim() });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a Trader.",
      500,
    );
    return next(error);
  }

  try {
    existingTrader = await User.findOne({ email: email.trim() });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a Trader.",
      500,
    );
    return next(error);
  }
  if (trader) {
    password = trader.title + "1234";
    try {
      hashedPassword = await bcrypt.hash(password, 12);
    } catch (err) {
      const error = new HttpError(
        "Could not update password, please try again.",
        500,
      );
      return next(error);
    }

    try {
      existingTrader
        .updateOne({ $set: { password: hashedPassword } })
        .then((obj) => {
          console.log("Updated - ");
        })
        .catch((err) => {
          const error = new HttpError(
            "Could not update password, please try again.",
            500,
          );
        });
      res.json({
        password: password,
      });
    } catch (err) {
      const error = new HttpError(
        "Could not update password, please try again.",
        500,
      );
      return next(error);
    }
  }
};

const addPublicKey = async (req, res, next) => {
  const { publicKey, userName } = req.body;
  let userExists = await Apppublickey.findOne({ userName: userName });
  if (userExists) {
    userExists.publicKey = publicKey;
    try {
      await userExists.save();
    } catch (err) {
      const error = new HttpError(
        "Could not update public key, please try again.",
        500,
      );
      return next(error);
    }
  } else {
    const createdAppPK = await new Apppublickey({
      publicKey,
      userName,
    });

    try {
      await createdAppPK.save();
    } catch (err) {
      const error = new HttpError(
        "Could not add public key, please try again.",
        500,
      );
      return next(error);
    }
  }
  res.status(201).json({
    message: "Public key added successfully.",
  });
};

const loginBiometrics = async (req, res, next) => {
  let { signature, payload, userName } = req.body;
  let publicKey = await Apppublickey.findOne({ userName: userName });
  let publicKeyString = publicKey.publicKey.trim().toString();

  const formattedKey = `-----BEGIN PUBLIC KEY-----\n${publicKeyString}\n-----END PUBLIC KEY-----`;

  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(payload);

    const isVerified = verifier.verify(formattedKey, signature, "base64");
    if (isVerified) {
      return res.status(200).json({
        message: "Biometric authentication successful.",
        success: true,
      });
    } else {
      return res
        .status(401)
        .json({ message: "Invalid biometric signature.", success: false });
    }
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Invalid signature or payload.", success: false });
  }

  return res
    .status(401)
    .json({ message: "Invalid biometric signature.", success: false });
};

const generatePayLoad = async (req, res, next) => {
  let payloadId;
  console.log("test");
  try {
    payloadId = crypto.randomUUID();
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Something went wrong while generating payload." });
  }

  if (payloadId) {
    return res.status(200).json({
      message: "Payload generated successfully.",
      payloadId: payloadId,
    });
  }
};

exports.forgotPassword = forgotPassword;
exports.getUsers = getUsers;
exports.getManufacturers = getManufacturers;
exports.getTraders = getTraders;
exports.signup = signup;
exports.login = login;
exports.addPublicKey = addPublicKey;
exports.loginBiometrics = loginBiometrics;
exports.generatePayLoad = generatePayLoad;
