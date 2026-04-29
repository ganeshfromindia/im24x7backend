const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const traderDashboardSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  aadhaar: { type: String, required: true },
  userId: { type: mongoose.Types.ObjectId, ref: "User" },
  admin: { type: mongoose.Types.ObjectId, ref: "User" },
  manufacturers: [{ type: mongoose.Types.ObjectId, ref: "Manufacturer" }],
});

module.exports = mongoose.model("TraderDashboard", traderDashboardSchema);
