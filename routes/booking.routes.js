const express = require("express");
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  confirmBooking,
  cancelBooking,
  markAttended,
  getUserBookings,
} = require("../controllers/booking.controller");

// Import authentication middleware
const authMiddleware = require("../middleware/authMiddleware");
const { verifiedUserMiddleware } = require("../middleware/authMiddleware");
const ownerAuth = require("../middleware/ownerAuth");

const router = express.Router();

// Prevent CastError for GET /createBooking
router.get("/createBooking", (req, res) => {
  res
    .status(405)
    .json({ msg: "Method Not Allowed. Use POST to create a booking." });
});

// Handle CORS preflight for /createBooking
router.options("/createBooking", (req, res) => {
  res.sendStatus(200);
});

// Create booking - REQUIRES AUTHENTICATION AND VERIFICATION
router.post(
  "/createBooking",
  authMiddleware,
  verifiedUserMiddleware,
  createBooking,
);

// Get all bookings
router.get("/getBookings", getAllBookings);

// Get user's bookings - REQUIRES AUTHENTICATION AND VERIFICATION
router.get(
  "/user/myBookings",
  authMiddleware,
  verifiedUserMiddleware,
  getUserBookings,
);

// Get booking by ID
router.get("/:id", getBookingById);

// Update booking - REQUIRES AUTHENTICATION AND VERIFICATION
router.put("/:id", authMiddleware, verifiedUserMiddleware, updateBooking);

// Delete booking - REQUIRES AUTHENTICATION AND VERIFICATION
router.delete("/:id", authMiddleware, verifiedUserMiddleware, deleteBooking);

// Confirm booking - REQUIRES OWNER AUTHENTICATION
router.put("/confirm/:bookingId", ownerAuth, confirmBooking);

// Cancel booking - REQUIRES OWNER AUTHENTICATION
router.put("/cancel/:bookingId", ownerAuth, cancelBooking);

// Mark booking as attended/played - REQUIRES OWNER AUTHENTICATION
router.put("/attend/:bookingId", ownerAuth, markAttended);

module.exports = router;
