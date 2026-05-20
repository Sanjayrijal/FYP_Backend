const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  futsal: { type: mongoose.Schema.Types.ObjectId, ref: "Futsal" },
  discount: { type: Number, required: true }, // percentage
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  usedAt: { type: Date },
});

module.exports = mongoose.model("Coupon", CouponSchema);
