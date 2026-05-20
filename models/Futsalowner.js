const mongoose = require("mongoose");

const FutsalOwnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    contactNumber: {
      type: String,
      required: true,
    },

    preferredMobileNumber: {
      type: String,
      default: "",
    },

    whatsappNumber: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    profile: {
      type: String,
      default: "",
    },

    businessName: {
      type: String,
      required: true,
    },

    businessAddress: {
      type: String,
      required: true,
    },

    registrationNumber: {
      type: String,
      default: "",
      trim: true,
    },

    preferredContactMethod: {
      type: String,
      enum: ["phone", "whatsapp", "email"],
      default: "phone",
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    resetToken: {
      type: String,
    },

    resetTokenExpiry: {
      type: Date,
    },

    otp: {
      type: String,
    },

    otpExpiry: {
      type: Date,
    },

    notifications: [
      {
        type: {
          type: String,
          enum: ["futsal_deleted", "general"],
          default: "general",
        },
        title: {
          type: String,
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        futsalName: {
          type: String,
          default: "",
        },
        reason: {
          type: String,
          default: "",
        },
        read: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("FutsalOwner", FutsalOwnerSchema);
