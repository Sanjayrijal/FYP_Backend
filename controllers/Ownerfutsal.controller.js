const Futsal = require("../models/Futsal");
const Booking = require("../models/booking");
const FutsalOwner = require("../models/Futsalowner");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");

const isProduction = process.env.NODE_ENV === "production";

const getBackendBaseUrl = () => {
  const configured = (process.env.BACKEND_PUBLIC_URL || "").replace(/\/$/, "");
  if (configured) return configured;
  if (!isProduction) return `http://localhost:${process.env.PORT || 5001}`;
  throw new Error("BACKEND_PUBLIC_URL must be set in production");
};

// UPLOAD IMAGE - Store locally
const uploadFutsalImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    console.log("\n📁 File uploaded locally");
    console.log("File:", req.file.filename);
    console.log("Path:", `/uploads/${req.file.filename}`);

    const BASE_URL = getBackendBaseUrl();
    const secure_url = `${BASE_URL}/uploads/${req.file.filename}`;

    res.json({
      secure_url: secure_url,
      public_id: req.file.filename,
    });
  } catch (error) {
    console.error("❌ Upload Error:", error.message);

    // Delete local file on error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting local file:", err);
      });
    }

    res.status(500).json({ error: error.message });
  }
};

// CREATE FUTSAL (Owner adds their own venue)
const createOwnerFutsal = async (req, res) => {
  try {
    const {
      id,
      name,
      location,
      latitude,
      longitude,
      pricePerHour,
      contactNumber,
      openingTime,
      closingTime,
      description,
      images,
    } = req.body;

    if (
      !id ||
      !name ||
      !location ||
      !pricePerHour ||
      !contactNumber ||
      !openingTime ||
      !closingTime
    ) {
      return res
        .status(400)
        .json({ msg: "All required fields must be provided" });
    }

    // Images are now local file URLs sent from frontend
    const parsedImages = images ? JSON.parse(images) : [];
    // Filter out null/undefined/empty string values
    const imageUrls = parsedImages.filter((img) => img && img.trim());

    console.log("📸 Raw images received:", parsedImages);
    console.log("📸 Filtered images saved:", imageUrls);

    const futsal = new Futsal({
      id,
      name,
      location,
      latitude,
      longitude,
      pricePerHour,
      contactNumber,
      openingTime,
      closingTime,
      images: imageUrls,
      description,
      owner: req.owner.ownerId, // From auth middleware
      approved: false, // Admin approval required
    });

    await futsal.save();

    res.status(201).json({
      success: true,
      msg: "Futsal created successfully! Pending admin approval.",
      data: futsal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// GET ALL FUTSALS FOR OWNER
const getOwnerFutsals = async (req, res) => {
  try {
    const futsals = await Futsal.find({ owner: req.owner.ownerId });

    res.status(200).json({
      success: true,
      count: futsals.length,
      data: futsals,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// GET SINGLE FUTSAL BY ID (Owner only)
const getOwnerFutsalById = async (req, res) => {
  try {
    const futsal = await Futsal.findOne({
      _id: req.params.id,
      owner: req.owner.ownerId,
    });

    if (!futsal) {
      return res.status(404).json({ msg: "Futsal not found or unauthorized" });
    }

    res.status(200).json({
      success: true,
      data: futsal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// DELETE FUTSAL
const deleteOwnerFutsal = async (req, res) => {
  try {
    const futsal = await Futsal.findOne({
      _id: req.params.id,
      owner: req.owner.ownerId,
    });

    if (!futsal) {
      return res.status(404).json({ msg: "Futsal not found or unauthorized" });
    }

    await Futsal.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      msg: "Futsal deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// GET BOOKINGS FOR OWNER'S FUTSALS
const getOwnerBookings = async (req, res) => {
  try {
    // Get all futsal IDs owned by this owner
    const ownerFutsals = await Futsal.find({ owner: req.owner.ownerId }).select(
      "_id",
    );
    const futsalIds = ownerFutsals.map((f) => f._id);

    // Get all bookings for these futsals
    const bookings = await Booking.find({ futsal: { $in: futsalIds } })
      .populate("user", "name email contactNumber")
      .populate("futsal", "name location pricePerHour")
      .sort({ bookingDate: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// GET BOOKINGS FOR A SPECIFIC FUTSAL
const getFutsalBookings = async (req, res) => {
  try {
    // Verify ownership
    const futsal = await Futsal.findOne({
      _id: req.params.futsalId,
      owner: req.owner.ownerId,
    });

    if (!futsal) {
      return res.status(404).json({ msg: "Futsal not found or unauthorized" });
    }

    const bookings = await Booking.find({ futsal: req.params.futsalId })
      .populate("user", "name email contactNumber")
      .sort({ bookingDate: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// UPDATE FUTSAL
const updateOwnerFutsal = async (req, res) => {
  try {
    const futsal = await Futsal.findOne({
      _id: req.params.id,
      owner: req.owner.ownerId,
    });

    if (!futsal) {
      return res.status(404).json({ msg: "Futsal not found or unauthorized" });
    }

    // Extract images from request body (local file URLs from frontend)
    let images = futsal.images || [];
    if (req.body.images) {
      // If images array is passed as string, parse it; otherwise use as array
      const newImages =
        typeof req.body.images === "string"
          ? JSON.parse(req.body.images)
          : req.body.images;
      // Filter out null/undefined/empty string values
      images = newImages.filter((img) => img && img.trim());
      console.log("📸 Raw images received:", newImages);
      console.log("📸 Filtered images saved:", images);
    }

    const updateData = {
      ...req.body,
      images,
    };

    const updatedFutsal = await Futsal.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      msg: "Futsal updated successfully",
      data: updatedFutsal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// GET OWNER NOTIFICATIONS
const getOwnerNotifications = async (req, res) => {
  try {
    const owner = await FutsalOwner.findById(req.owner.ownerId).select(
      "notifications",
    );

    if (!owner) {
      return res.status(404).json({ msg: "Owner not found" });
    }

    const notifications = [...(owner.notifications || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// MARK OWNER NOTIFICATION AS READ
const markOwnerNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const owner = await FutsalOwner.findOneAndUpdate(
      {
        _id: req.owner.ownerId,
        "notifications._id": notificationId,
      },
      {
        $set: { "notifications.$.read": true },
      },
      { new: true },
    ).select("notifications");

    if (!owner) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    const notification = owner.notifications.id(notificationId);

    res.status(200).json({
      success: true,
      msg: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// VERIFY BOOKING (Owner approves or rejects)
const verifyBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { action, rejectionReason } = req.body;

    // Validate input
    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        msg: 'Action must be either "approve" or "reject"',
      });
    }

    // Find booking
    const booking = await Booking.findById(bookingId).populate("futsal");
    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" });
    }

    // Verify that the owner owns this futsal
    if (booking.futsal.owner.toString() !== req.owner.ownerId) {
      return res.status(403).json({ msg: "Unauthorized - not the owner" });
    }

    // Check if already verified
    if (booking.ownerVerificationStatus !== "pending") {
      return res.status(400).json({
        msg: `Booking already ${booking.ownerVerificationStatus}`,
      });
    }

    // Update booking status
    booking.ownerVerified = action === "approve";
    booking.ownerVerificationStatus =
      action === "approve" ? "approved" : "rejected";
    booking.ownerVerifiedAt = new Date();
    if (action === "reject") {
      booking.ownerRejectionReason = rejectionReason || "";
    }

    await booking.save();

    // TODO: Send notification email to user about approval/rejection

    res.status(200).json({
      success: true,
      msg: `Booking ${action === "approve" ? "approved" : "rejected"} successfully`,
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = {
  uploadFutsalImage,
  createOwnerFutsal,
  getOwnerFutsals,
  getOwnerFutsalById,
  updateOwnerFutsal,
  deleteOwnerFutsal,
  getOwnerBookings,
  getFutsalBookings,
  getOwnerNotifications,
  markOwnerNotificationRead,
  verifyBooking,
};
// END OF FILE
