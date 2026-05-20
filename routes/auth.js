const express = require("express");
const jwt = require("jsonwebtoken");
const {
  register,
  login,
  forgetPassword,
  resetPassword,
  verifyOTP,
  resendOTP,
} = require("../controllers/auth.controller");
const passport = require("../config/passport");

const router = express.Router();

// User Registration
router.post("/register", register);
router.post("/login", login);

// OTP Verification Routes
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// Forgot Password Route
router.post("/forget-password", forgetPassword);

// Reset Password Route
router.post("/reset-password", resetPassword);

// Google OAuth - login route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// Google OAuth - callback route
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:5173"}/LoginSignup`,
    session: true,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/explore?token=${token}`);
  },
);

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect(process.env.FRONTEND_URL || "http://localhost:5173/");
  });
});

module.exports = router;
