const express = require("express");
const {
  checkout,
  initiateEsewaPayment,
  esewaCallback,
  esewaFailure,
  initiateKhaltiPayment,
  khaltiCallback,
} = require("../controllers/payment.controller");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Checkout (apply coupon + mark booking paid)
router.post("/checkout", authMiddleware, checkout);

// eSewa flow
router.post("/esewa/initiate", authMiddleware, initiateEsewaPayment);
router.get("/esewa/callback", esewaCallback);
router.get("/esewa/failure", esewaFailure);

// Khalti flow
router.post("/khalti/initiate", authMiddleware, initiateKhaltiPayment);
router.get("/khalti/callback", khaltiCallback);

module.exports = router;
