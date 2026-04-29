const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const traderSchema = new Schema({
  title: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String },
  listing: { type: String },
  category: [{ type: String }],
  manufacturers: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Manufacturer",
    },
  ],
  products: [{ type: mongoose.Types.ObjectId, required: true, ref: "Product" }],
});

module.exports = mongoose.model("Trader", traderSchema);
