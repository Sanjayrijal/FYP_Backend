const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

// Get all notifications for logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .populate("bookingId");

    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get unread count
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.userId,
      read: false,
    });

    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Mark notification as read
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    notification.read = true;
    await notification.save();

    res.json({ msg: "Notification marked as read", notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Mark all as read
router.put("/mark-all-read", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, read: false },
      { read: true },
    );

    res.json({ msg: "All notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Delete notification
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    res.json({ msg: "Notification deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
