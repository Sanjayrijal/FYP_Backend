const mongoose = require("mongoose");

const FutsalSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  // Google Maps Coordinates
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  pricePerHour: { type: Number, required: true },
  contactNumber: { type: String, required: true },
  openingTime: { type: String, required: true },
  closingTime: { type: String, required: true },
  images: [{ type: String }],
  description: { type: String },

  // NEW: Owner reference
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FutsalOwner",
    required: true,
  },

  // NEW: Approval status (for admin moderation)
  approved: {
    type: Boolean,
    default: false,
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Futsal", FutsalSchema);
