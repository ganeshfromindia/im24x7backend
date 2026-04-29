const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const appPK = new Schema({
  publickey: { type: String, required: true },
  userName: { type: String, required: true },
});

module.exports = mongoose.model("AppPK", appPK);
