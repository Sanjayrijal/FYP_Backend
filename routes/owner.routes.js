const express = require("express");
const {
  registerOwner,
  loginOwner,
  verifyOTP,
  getOwnerProfile,
  updateOwnerProfile,
  deleteOwnerAccount,
  forgotPassword,
  resetPassword,
} = require("../controllers/owner.controller");
const ownerAuth = require("../middleware/ownerAuth");

const router = express.Router();

// Public routes
router.post("/register", registerOwner);
router.post("/login", loginOwner);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/profile", ownerAuth, getOwnerProfile);
router.put("/profile", ownerAuth, updateOwnerProfile);
router.delete("/profile", ownerAuth, deleteOwnerAccount);

module.exports = router;
