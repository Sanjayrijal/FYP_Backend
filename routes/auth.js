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

const normalizeUrl = (url) => (url ? url.replace(/\/$/, "") : "");
const isProduction = process.env.NODE_ENV === "production";
const frontendUrl = normalizeUrl(process.env.FRONTEND_URL);

const getFrontendBaseUrl = () => {
  if (frontendUrl) return frontendUrl;
  if (!isProduction) return "http://localhost:5173";
  throw new Error("FRONTEND_URL must be set in production");
};

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
    failureRedirect: `${getFrontendBaseUrl()}/LoginSignup`,
    session: true,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.redirect(`${getFrontendBaseUrl()}/explore?token=${token}`);
  },
);

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect(`${getFrontendBaseUrl()}/`);
  });
});

module.exports = router;
