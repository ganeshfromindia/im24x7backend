const HttpError = require("../models/http-error");
const Product = require("../models/product");

const getDownloadByFile = async (req, res, next) => {
  const file = req.query.file;
  const fileReference = req.query.file.split("/").pop().split(".")[0];
  let productFilesData;
  try {
    productFilesData = await Product.findOne({ [fileReference]: file });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a the file.",
      500
    );
    return next(error);
  }

  if (!productFilesData) {
    const error = new HttpError("Could not find the file on server.", 404);
    return next(error);
  }
  res.download(productFilesData[fileReference]);
};

exports.getDownloadByFile = getDownloadByFile;
