const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const apppublickeySchema = new Schema({
  publicKey: { type: String, required: true },
  userName: { type: String, required: true },
});

module.exports = mongoose.model("Apppublickey", apppublickeySchema);
