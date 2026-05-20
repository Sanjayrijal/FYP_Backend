const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // ← fixed for Google OAuth
  contactNumber: { type: String },
  location: { type: String },
  bio: { type: String },
  dateOfBirth: { type: Date },
  gender: {
    type: String,
    enum: ["male", "female", "other", "prefer_not_to_say"],
    default: "prefer_not_to_say",
  },
  notificationPreferences: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
  },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  googleId: { type: String, unique: true, sparse: true },
  profilePic: { type: String },
  verified: {
    type: Boolean,
    default: false,
  },
  otp: String,
  otpExpiry: Date,
  // Loyalty tracking: stores counts per futsal for completed bookings
  loyalty: [
    {
      futsal: { type: mongoose.Schema.Types.ObjectId, ref: "Futsal" },
      count: { type: Number, default: 0 },
    },
  ],
  // Reference to coupon documents issued to the user
  coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],
  // User's favorite futsals
  favorites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Futsal",
    },
  ],
});

module.exports = mongoose.model("User", UserSchema);
