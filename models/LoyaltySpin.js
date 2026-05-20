const mongoose = require("mongoose");

const LoyaltySpinSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  futsal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Futsal",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  spun: { type: Boolean, default: false },
  discount: { type: Number },
  code: { type: String },
  spunAt: { type: Date },
});

module.exports = mongoose.model("LoyaltySpin", LoyaltySpinSchema);
