const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const productSchema = new Schema({
  folder: { type: String },
  category: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: String, required: true },
  image: { type: String },
  coa: { type: String },
  msds: { type: String },
  cep: { type: String },
  qos: { type: String },
  impurities: { type: String },
  refStandards: { type: String },
  dmf: [{ type: String }],
  pharmacopoeias: [{ type: String }],
  manufacturer: { type: mongoose.Types.ObjectId, ref: "Manufacturer" },
  traders: [{ type: mongoose.Types.ObjectId, ref: "Trader" }],
});

module.exports = mongoose.model("Product", productSchema);
