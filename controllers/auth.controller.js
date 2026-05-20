const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendEmail } = require("../utils/emailUtils");
const crypto = require("crypto");
require("dotenv").config();

const router = express.Router();

// User Registration
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    user = new User({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpiry,
      verified: false,
    });

    await user.save();

    // Send OTP email
    await sendEmail(
      email,
      "KickHub Verification Code",
      `Your verification code is: ${otp}`,
    );

    res.status(201).json({
      msg: "Verification code sent to email",
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Check if user is verified
    if (!user.verified) {
      return res.status(403).json({
        verified: false,
        email: user.email,
        msg: "Please verify your email before login. Check your email for the verification code.",
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ msg: "Server Error" });
  }
};

const forgetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const token = crypto.randomInt(100000, 999999).toString();

    const expiryTime = Date.now() + 3600000; // 1 hour expiry time

    // Save reset token and expiry time in the user record
    user.resetToken = token;
    user.resetTokenExpiry = expiryTime;

    await user.save();

    const message = `
<p>Hello,</p>

<p>You requested to reset your KickHub password.
Your 6-digit reset code is:</p>
<h1><b>${token}</b></h1>  
This code will expire in 1 hour.
If you did not request this, please ignore this email.
KickHub Team</p>
`;

    sendEmail(email, "KickHub Password Reset", message);

    res.status(200).json({ msg: "Password reset token sent to your email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// Password Reset (Verify Token and Reset Password)
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Find user by reset token and check if it has expired
    let user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ msg: "Invalid or expired token" });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password and clear reset token and expiry
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ msg: "Password successfully reset" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// OTP Verification
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ msg: "Email and OTP are required" });
    }

    // Find user by email
    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Check if already verified
    if (user.verified) {
      return res.status(400).json({ msg: "User already verified" });
    }

    // Check if OTP exists and is not expired
    if (!user.otp) {
      return res
        .status(400)
        .json({ msg: "No OTP found. Please sign up again." });
    }

    if (Date.now() > user.otpExpiry) {
      return res
        .status(400)
        .json({ msg: "OTP has expired. Please request a new one." });
    }

    // Validate OTP
    if (user.otp !== otp) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    // Mark user as verified and clear OTP
    user.verified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res
      .status(200)
      .json({ msg: "Email verified successfully. You can now login." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate input
    if (!email) {
      return res.status(400).json({ msg: "Email is required" });
    }

    // Find user by email
    let user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Check if already verified
    if (user.verified) {
      return res.status(400).json({ msg: "User is already verified" });
    }

    // Generate new 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update user with new OTP
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email
    await sendEmail(
      email,
      "KickHub Verification Code",
      `Your new verification code is: ${otp}`,
    );

    res.status(200).json({
      msg: "New verification code sent to email",
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = {
  register,
  login,
  forgetPassword,
  resetPassword,
  verifyOTP,
  resendOTP,
};
