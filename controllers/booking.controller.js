const Booking = require("../models/booking");
const Futsal = require("../models/Futsal");
const User = require("../models/User");
const LoyaltySpin = require("../models/LoyaltySpin");
const Coupon = require("../models/Coupon");
const {
  sendBookingConfirmation,
  sendBookingCancellation,
} = require("../services/notificationService");
const FutsalOwner = require("../models/Futsalowner");
const Notification = require("../models/Notification");

// CREATE BOOKING
const createBooking = async (req, res) => {
  try {
    const { bookingDate, startTime, endTime, futsal } = req.body;

    if (!bookingDate || !startTime || !endTime || !futsal) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    // DATE & TIME VALIDATION
    const today = new Date();
    today.setHours(0, 0, 0, 0); // reset time

    const selectedDate = new Date(bookingDate);
    selectedDate.setHours(0, 0, 0, 0);

    // Past date (yesterday)
    if (selectedDate < today) {
      return res.status(400).json({
        msg: "You cannot book a futsal for a past date",
      });
    }

    // Convert start & end time to Date objects
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(bookingDate);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    // End time before or same as start time
    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        msg: "End time must be greater than start time",
      });
    }

    // Past time (earlier today)
    const now = new Date();
    if (startDateTime < now) {
      return res.status(400).json({
        msg: "You cannot book a futsal for a past time",
      });
    }

    // CREATE BOOKING
    const booking = new Booking({
      bookingDate,
      startTime,
      endTime,
      futsal,
      user: req.user.userId,
    });

    await booking.save();

    res.status(201).json({
      msg: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// GET ALL BOOKINGS
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("futsal", "name location pricePerHour");

    res.status(200).json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// GET BOOKING BY ID
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email")
      .populate("futsal", "name location pricePerHour");

    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" });
    }

    res.status(200).json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// UPDATE BOOKING
const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" });
    }

    if (booking.user.toString() !== req.user.userId) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );

    res.status(200).json({
      msg: "Booking updated successfully",
      data: updatedBooking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// DELETE BOOKING
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" });
    }

    if (booking.user.toString() !== req.user.userId) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    await booking.deleteOne();

    res.status(200).json({ msg: "Booking deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// CONFIRM BOOKING (By Futsal Owner)
const confirmBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId).populate("futsal");

    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" });
    }

    // Verify that the authenticated owner owns the futsal
    const futsal = await Futsal.findOne({
      _id: booking.futsal._id,
      owner: req.owner.ownerId,
    });

    if (!futsal) {
      return res.status(403).json({
        msg: "Unauthorized: You don't own this futsal",
      });
    }

    // Update booking status
    booking.status = "confirmed";
    await booking.save();

    // Send confirmation email and notification
    await sendBookingConfirmation(booking._id);

    res.status(200).json({
      msg: "Booking confirmed successfully and email sent to user",
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// CANCEL BOOKING (By Futsal Owner)
const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId).populate("futsal");

    if (!booking) {
      return res.status(404).json({ msg: "Booking not found" });
    }

    // Verify that the authenticated owner owns the futsal
    const futsal = await Futsal.findOne({
      _id: booking.futsal._id,
      owner: req.owner.ownerId,
    });

    if (!futsal) {
      return res.status(403).json({
        msg: "Unauthorized: You don't own this futsal",
      });
    }

    // Update booking status
    booking.status = "cancelled";
    booking.cancelledByOwner = true;
    booking.cancellationReason = reason || "Cancelled by futsal owner";
    booking.cancelledAt = new Date();
    await booking.save();

    // Send cancellation email and notification
    await sendBookingCancellation(booking._id, reason);

    res.status(200).json({
      msg: "Booking cancelled successfully and email sent to user",
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// MARK ATTENDED / PLAYED (owner marks booking as attended after play)
const markAttended = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate("futsal")
      .populate("user");

    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    // Only allow if booking is confirmed
    if (booking.status !== "confirmed") {
      return res
        .status(400)
        .json({ msg: "Booking must be confirmed before marking attended" });
    }

    if (booking.attended) {
      return res
        .status(400)
        .json({ msg: "Booking already marked as attended" });
    }

    booking.attended = true;
    await booking.save();

    // Update user's loyalty count for this futsal
    const user = await User.findById(booking.user._id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.loyalty = user.loyalty || [];
    const futsalId = booking.futsal._id.toString();
    let entry = user.loyalty.find((e) => e.futsal?.toString() === futsalId);
    if (!entry) {
      user.loyalty.push({ futsal: booking.futsal._id, count: 1 });
    } else {
      entry.count = (entry.count || 0) + 1;
    }

    await user.save();

    // If user reached a multiple of 5, create a pending spin (user will spin on client)
    const updatedEntry = user.loyalty.find(
      (e) => e.futsal?.toString() === futsalId,
    );
    let spin = null;
    if (updatedEntry && updatedEntry.count % 5 === 0) {
      spin = new LoyaltySpin({ user: user._id, futsal: booking.futsal._id });
      await spin.save();
    }

    res.status(200).json({ msg: "Booking marked as attended", spin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// GET USER'S BOOKINGS
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.user.userId,
    })
      .populate("futsal", "name location pricePerHour image")
      .sort({ bookingDate: -1 });

    res.status(200).json({
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

// USER: Request reschedule
const requestReschedule = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { requestedDate, requestedStartTime, requestedEndTime, reason } =
      req.body;

    const booking = await Booking.findById(bookingId).populate("futsal");
    if (!booking) return res.status(404).json({ msg: "Booking not found" });

    if (booking.user.toString() !== req.user.userId)
      return res.status(403).json({ msg: "Unauthorized" });

    // Build original start DateTime
    const [origStartHour, origStartMin] = booking.startTime
      .split(":")
      .map(Number);
    const originalStart = new Date(booking.bookingDate);
    originalStart.setHours(origStartHour, origStartMin, 0, 0);

    const now = new Date();
    const hoursDiff = (originalStart - now) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      return res.status(400).json({ msg: "Rescheduling allowed only before 24 hours" });
    }

    // Save reschedule request
    booking.rescheduleRequest = {
      requestedDate: requestedDate,
      requestedStartTime: requestedStartTime,
      requestedEndTime: requestedEndTime,
      reason: reason || "",
      status: "pending",
      requestedAt: new Date(),
    };

    await booking.save();

    // Notify owner via embedded notifications on FutsalOwner
    const ownerId = booking.futsal.owner;
    const ownerNotification = {
      type: "general",
      title: "Reschedule request",
      message: `User requested reschedule for ${booking.futsal.name} on ${new Date(requestedDate).toLocaleDateString()} ${requestedStartTime}-${requestedEndTime}`,
      futsalName: booking.futsal.name,
      reason: reason || "",
      read: false,
      createdAt: new Date(),
    };

    await FutsalOwner.findByIdAndUpdate(ownerId, {
      $push: { notifications: ownerNotification },
    });

    return res.status(200).json({ success: true, msg: "Reschedule requested" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  confirmBooking,
  cancelBooking,
  getUserBookings,
  markAttended,
  requestReschedule,
};
