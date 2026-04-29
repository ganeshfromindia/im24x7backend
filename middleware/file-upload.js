const multer = require("multer");
const mkdirp = require("mkdirp");

const fse = require("fs-extra");

const Product = require("../models/product");

const rimraf = require("rimraf");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "application/pdf": "pdf",
};

const fileUpload = multer({
  limits: 500000,
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      let product;
      if (req.params.pid) {
        const productId = req.params.pid;
        try {
          product = await Product.findById(productId);
        } catch (err) {
          const error = new HttpError(
            "Something went wrong, could not update Product.",
            500
          );
          return next(error);
        }
      }
      const folder = req.body.folder || "miscellaneous";
      const finalpath = `uploads/documents/${folder}/${file.fieldname}`;
      if (product) {
        if (product.folder == req.body.folder) {
          mkdirp.sync(finalpath);
        } else {
          if (fse.existsSync(`uploads/documents/${product.folder}`)) {
            try {
              fse.copySync(
                `uploads/documents/${product.folder}`,
                `uploads/documents/${folder}`
              );
              rimraf(`uploads/documents/${product.folder}`, (err) =>
                console.log(err)
              );
            } catch (err) {
              console.log(err);
            }

            //fse.rmdirSync(`uploads/documents/${product.folder}`);
          }
          mkdirp.sync(finalpath);
        }
      } else {
        mkdirp.sync(finalpath);
      }
      cb(null, finalpath);
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      // cb(null, uuid() + '.' + ext);
      cb(null, file.fieldname + "." + ext);
    },
  }),

  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid
      ? null
      : new Error("Please upload jpg, png, pdf files only!");
    cb(error, isValid);
  },
});

module.exports = fileUpload;
