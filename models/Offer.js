const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  discount: { type: String, required: true }, // e.g., "20%", "500 Rs", "Free Hour"
  code: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  futsal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Futsal",
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FutsalOwner",
    required: true,
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Offer", OfferSchema);
