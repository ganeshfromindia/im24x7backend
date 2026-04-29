const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const manufacturerSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  aadhaar: { type: String, required: true },
  userId: { type: mongoose.Types.ObjectId, ref: "User" },
  admin: { type: mongoose.Types.ObjectId, ref: "User" },
  traders: [{ type: mongoose.Types.ObjectId, ref: "Trader" }],
  products: [{ type: mongoose.Types.ObjectId, ref: "Product" }],
});

module.exports = mongoose.model("Manufacturer", manufacturerSchema);
