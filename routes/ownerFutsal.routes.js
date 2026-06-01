const express = require("express");
const {
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
  approveReschedule,
  rejectReschedule,
  uploadFutsalImage,
  cancelBooking,
} = require("../controllers/Ownerfutsal.controller");
const ownerAuth = require("../middleware/ownerAuth");
const upload = require("../middleware/upload");

const router = express.Router();

// All routes require owner authentication
router.use(ownerAuth);

// Image upload endpoint (multipart/form-data — multer required here)
router.post("/upload-image", upload.single("file"), uploadFutsalImage);

// Futsal management (JSON body — no multer needed)
router.post("/futsals", createOwnerFutsal);
router.get("/futsals", getOwnerFutsals);
router.get("/futsals/:id", getOwnerFutsalById);
router.put("/futsals/:id", updateOwnerFutsal);
router.delete("/futsals/:id", deleteOwnerFutsal);

// Booking management
router.get("/bookings", getOwnerBookings);
router.get("/futsals/:futsalId/bookings", getFutsalBookings);

// Booking verification (Owner approval/rejection)
router.put("/bookings/:bookingId/verify", verifyBooking);

// Reschedule approval/rejection
router.put("/bookings/:bookingId/reschedule/approve", approveReschedule);
router.put("/bookings/:bookingId/reschedule/reject", rejectReschedule);

// Owner notifications
router.get("/notifications", getOwnerNotifications);
router.put("/notifications/:notificationId/read", markOwnerNotificationRead);

router.post("/bookings/:bookingId/cancel", cancelBooking);

module.exports = router;