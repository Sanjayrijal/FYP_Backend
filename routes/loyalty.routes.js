const express = require("express");
const {
  getPendingSpins,
  spinWheel,
  getUserCoupons,
  redeemCoupon,
} = require("../controllers/loyalty.controller");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get pending spins
router.get("/pending", authMiddleware, getPendingSpins);

// Perform a spin (creates coupon)
router.post("/spin", authMiddleware, spinWheel);

// Get user's coupons
router.get("/coupons", authMiddleware, getUserCoupons);

// Redeem coupon
router.post("/redeem", authMiddleware, redeemCoupon);

module.exports = router;
