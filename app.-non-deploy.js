const fs = require("fs");
const path = require("path");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const manufacturersRoutes = require("./routes/manufacturers-routes");
const usersRoutes = require("./routes/users-routes");
const tradersRoutes = require("./routes/traders-routes");
const productsRoutes = require("./routes/products-routes");
const downloadRoutes = require("./routes/downloads-routes");
const HttpError = require("./models/http-error");
// const cookieParser = require("cookie-parser");

const app = express();
app.use(cors());
// app.use(cors({ origin: "http://localhost:3000/", credentials: true }));

// app.use(cookieParser());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

app.use("/api/manufacturers", manufacturersRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/traders", tradersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/download", downloadRoutes);

app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  console.log(error);
  res.json({ message: error.message || ["An unknown error occurred!"] });
});

mongoose
  .connect(
    // `mongodb+srv://hello:1Uv89RYdf75fal3w@ewcluster0.kxltmm6.mongodb.net/apitraders?authSource=admin&replicaSet=rs0&retryWrites=true&w=majority&appName=EWCluster0`
    `mongodb+srv://hello:1Uv89RYdf75fal3w@ewcluster0.kxltmm6.mongodb.net/apitraders?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(5000);
  })
  .catch((err) => {
    console.log(err);
  });

// const randomNumber = Math.random();

// exports.randomNumber = randomNumber;
