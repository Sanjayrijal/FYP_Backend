const LoyaltySpin = require("../models/LoyaltySpin");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const crypto = require("crypto");

// Get pending spins for authenticated user
const getPendingSpins = async (req, res) => {
  try {
    const spins = await LoyaltySpin.find({
      user: req.user.userId,
      spun: false,
    }).populate("futsal", "name");
    res.status(200).json(spins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// Perform a spin: reveals a discount and issues a coupon
const spinWheel = async (req, res) => {
  try {
    // locate a pending spin by id if provided, otherwise the first pending spin for user
    const { spinId } = req.body || {};
    let spin = null;
    if (spinId) {
      spin = await LoyaltySpin.findOne({
        _id: spinId,
        user: req.user.userId,
        spun: false,
      });
    } else {
      spin = await LoyaltySpin.findOne({ user: req.user.userId, spun: false });
    }

    if (!spin) return res.status(404).json({ msg: "No pending spin found" });

    const choices = [5, 6, 7, 0];
    const discount = choices[Math.floor(Math.random() * choices.length)];

    // Generate unique code
    const code = `LH-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Create coupon
    const coupon = new Coupon({
      code,
      user: req.user.userId,
      futsal: spin.futsal,
      discount,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await coupon.save();

    // mark spin as used
    spin.spun = true;
    spin.discount = discount;
    spin.code = code;
    spin.spunAt = new Date();
    await spin.save();

    // attach to user
    const user = await User.findById(req.user.userId);
    user.coupons = user.coupons || [];
    user.coupons.push(coupon._id);
    await user.save();

    res.status(200).json({ coupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// Get all coupons for user
const getUserCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ user: req.user.userId });
    res.status(200).json(coupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// Redeem a coupon (mark as used). Payment flow should call this when applying coupon.
const redeemCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ msg: "Coupon code required" });

    const coupon = await Coupon.findOne({ code, user: req.user.userId });
    if (!coupon) return res.status(404).json({ msg: "Coupon not found" });
    if (coupon.used)
      return res.status(400).json({ msg: "Coupon already used" });

    coupon.used = true;
    coupon.usedAt = new Date();
    await coupon.save();

    res.status(200).json({ msg: "Coupon redeemed", discount: coupon.discount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = { getPendingSpins, spinWheel, getUserCoupons, redeemCoupon };
