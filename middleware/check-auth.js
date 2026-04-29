const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1]; // Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error("Authentication failed! Please logout and login again");
    }
    const decodedToken = jwt.verify(token, "[,ZCqF0B8Zwwm?Q_f5-D<X3]PHtpLUSi");
    req.userData = {
      userId: decodedToken.userId,
      email: decodedToken.email,
      role: decodedToken.role,
      userName: decodedToken.userName,
    };
    next();
  } catch (err) {
    console.log(req);
    const error = new HttpError(
      "Authentication failed! Please logout and login again",
      403
    );
    return next(error);
  }
};
