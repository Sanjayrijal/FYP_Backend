const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  bookingDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  futsal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Futsal",
    required: true,
  },

  // Booking status: pending, confirmed, cancelled
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled"],
    default: "pending",
  },

  ownerComments: [
    {
      comment: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // Cancellation by owner
  cancelledByOwner: {
    type: Boolean,
    default: false,
  },
  cancellationReason: {
    type: String,
  },
  cancelledAt: {
    type: Date,
  },

  // Email notification tracking
  confirmationEmailSent: {
    type: Boolean,
    default: false,
  },
  confirmationEmailSentAt: {
    type: Date,
  },
  reminderEmailSent: {
    type: Boolean,
    default: false,
  },
  reminderEmailSentAt: {
    type: Date,
  },
  // Mark whether the user attended / played this booking
  attended: {
    type: Boolean,
    default: false,
  },
  // Payment tracking
  paid: {
    type: Boolean,
    default: false,
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "pending", "paid", "failed"],
    default: "unpaid",
  },
  paymentMethod: {
    type: String,
    enum: ["esewa", "khalti"],
  },
  paymentTransactionId: {
    type: String,
  },
  paymentReference: {
    type: String,
  },
  khaltiPidx: {
    type: String,
  },
  pendingAmount: {
    type: Number,
  },
  pendingDiscount: {
    type: Number,
    default: 0,
  },
  pendingCoupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
  },
  amountPaid: {
    type: Number,
  },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },

  // Reschedule request workflow
  rescheduleRequest: {
    requestedDate: { type: Date },
    requestedStartTime: { type: String },
    requestedEndTime: { type: String },
    reason: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedAt: { type: Date },
    reviewedAt: { type: Date },
  },

  // Owner verification fields
  ownerVerified: {
    type: Boolean,
    default: false,
  },
  ownerVerificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  ownerVerifiedAt: {
    type: Date,
    default: null,
  },
  ownerRejectionReason: {
    type: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", BookingSchema);
