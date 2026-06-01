const FutsalOwner = require("../models/Futsalowner");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../utils/emailUtils");
const {
  deleteOwnerAccountData,
} = require("../utils/accountDeletion");

// OWNER REGISTRATION
const registerOwner = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      contactNumber,
      businessName,
      businessAddress,
      preferredMobileNumber,
      whatsappNumber,
      city,
      registrationNumber,
      preferredContactMethod,
      website,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !contactNumber ||
      !businessName ||
      !businessAddress
    ) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const existingOwner = await FutsalOwner.findOne({ email });
    if (existingOwner) {
      return res
        .status(400)
        .json({ msg: "Owner already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    const owner = new FutsalOwner({
      name,
      email,
      password: hashedPassword,
      contactNumber,
      preferredMobileNumber: preferredMobileNumber || contactNumber,
      whatsappNumber: whatsappNumber || "",
      city: city || "",
      businessName,
      businessAddress,
      registrationNumber: registrationNumber || "",
      preferredContactMethod: preferredContactMethod || "phone",
      website: website || "",
      otp,
      otpExpiry,
      verified: false,
    });

    await owner.save();

    // Send OTP email
    await sendEmail(
      email,
      "KickHub Owner Verification Code",
      `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
    );

    res.status(201).json({
      msg: "Registration successful! Verification code sent to email",
      email: owner.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// OWNER LOGIN
const loginOwner = async (req, res) => {
  const { email, password } = req.body;

  try {
    const owner = await FutsalOwner.findOne({ email });
    if (!owner || !owner.isActive) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    if (!owner.verified) {
      return res.status(400).json({ msg: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign(
      { ownerId: owner._id, role: "owner" },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(200).json({
      msg: "Login successful",
      token,
      owner: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        businessName: owner.businessName,
        contactNumber: owner.contactNumber,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// VERIFY OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  console.log("Verifying OTP for email:", email, "with OTP:", otp);

  try {
    const owner = await FutsalOwner.findOne({
      email,
      otp,
      otpExpiry: { $gt: Date.now() },
    });

    if (!owner) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    owner.verified = true;
    owner.otp = undefined;
    owner.otpExpiry = undefined;
    await owner.save();

    res
      .status(200)
      .json({ msg: "Email verified successfully! You can now login." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// GET OWNER PROFILE
const getOwnerProfile = async (req, res) => {
  try {
    const owner = await FutsalOwner.findById(req.owner.ownerId).select(
      "-password",
    );

    if (!owner) {
      return res.status(404).json({ msg: "Owner not found" });
    }

    res.status(200).json(owner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// UPDATE OWNER PROFILE
const updateOwnerProfile = async (req, res) => {
  try {
    const {
      name,
      contactNumber,
      preferredMobileNumber,
      whatsappNumber,
      city,
      businessName,
      businessAddress,
      registrationNumber,
      preferredContactMethod,
      website,
      profile,
    } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (contactNumber !== undefined) updateFields.contactNumber = contactNumber;
    if (preferredMobileNumber !== undefined)
      updateFields.preferredMobileNumber = preferredMobileNumber;
    if (whatsappNumber !== undefined)
      updateFields.whatsappNumber = whatsappNumber;
    if (city !== undefined) updateFields.city = city;
    if (businessName !== undefined) updateFields.businessName = businessName;
    if (businessAddress !== undefined)
      updateFields.businessAddress = businessAddress;
    if (registrationNumber !== undefined)
      updateFields.registrationNumber = registrationNumber;
    if (preferredContactMethod !== undefined)
      updateFields.preferredContactMethod = preferredContactMethod;
    if (website !== undefined) updateFields.website = website;
    if (profile !== undefined) updateFields.profile = profile;

    const owner = await FutsalOwner.findByIdAndUpdate(
      req.owner.ownerId,
      updateFields,
      { new: true },
    ).select("-password");

    if (!owner) {
      return res.status(404).json({ msg: "Owner not found" });
    }

    res.status(200).json({
      msg: "Profile updated successfully",
      data: owner,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// DELETE OWNER ACCOUNT
const deleteOwnerAccount = async (req, res) => {
  try {
    const owner = await FutsalOwner.findById(req.owner.ownerId);
    if (!owner) {
      return res.status(404).json({ msg: "Owner not found" });
    }

    const deletionSummary = await deleteOwnerAccountData(owner._id);

    return res.status(200).json({
      msg: "Your owner account and related history were deleted successfully",
      data: deletionSummary,
    });
  } catch (error) {
    console.error("Error deleting owner account:", error);
    return res.status(500).json({ msg: "Server Error" });
  }
};

// FORGOT PASSWORD
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const owner = await FutsalOwner.findOne({ email });
    if (!owner) {
      return res.status(400).json({ msg: "Owner not found" });
    }

    const token = crypto.randomInt(100000, 999999).toString();
    const expiryTime = Date.now() + 3600000; // 1 hour

    owner.resetToken = token;
    owner.resetTokenExpiry = expiryTime;
    await owner.save();

    const message = `
      <p>Hello ${owner.name},</p>
      <p>You requested to reset your KickHub password.</p>
      <p>Your 6-digit reset code is:</p>
      <h1><b>${token}</b></h1>
      <p>This code will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>KickHub Team</p>
    `;

    await sendEmail(email, "KickHub Password Reset", message);

    res.status(200).json({ msg: "Password reset token sent to your email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// RESET PASSWORD
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const owner = await FutsalOwner.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!owner) {
      return res.status(400).json({ msg: "Invalid or expired token" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    owner.password = hashedPassword;
    owner.resetToken = undefined;
    owner.resetTokenExpiry = undefined;
    await owner.save();

    res.status(200).json({ msg: "Password successfully reset" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = {
  registerOwner,
  loginOwner,
  verifyOTP,
  getOwnerProfile,
  updateOwnerProfile,
  deleteOwnerAccount,
  forgotPassword,
  resetPassword,
};
