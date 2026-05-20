const Notification = require("../models/Notification");
const Booking = require("../models/booking");
const User = require("../models/User");
const Futsal = require("../models/Futsal");
const { sendEmail } = require("../utils/emailUtils");

// Email templates
const emailTemplates = {
  bookingConfirmation: (
    userName,
    futsalName,
    bookingDate,
    startTime,
    endTime,
    location,
  ) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .booking-details { background-color: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
            .button { background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmed! ✓</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              <p>Your futsal booking has been confirmed. Here are your booking details:</p>
              <div class="booking-details">
                <p><strong>Futsal:</strong> ${futsalName}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Date:</strong> ${new Date(bookingDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
              </div>
              <p>We're excited to see you play! If you need to modify or cancel your booking, please log in to your account.</p>
              <p>Thank you for choosing KickHub!</p>
            </div>
            <div class="footer">
              <p>© 2024 KickHub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },

  bookingReminder: (
    userName,
    futsalName,
    bookingDate,
    startTime,
    endTime,
    location,
  ) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .booking-details { background-color: #fff; padding: 15px; border-left: 4px solid #FF9800; margin: 15px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
            .highlight { color: #FF9800; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Reminder ⏰</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              <p>This is a reminder that your futsal booking is <span class="highlight">in the next 12 hours!</span></p>
              <div class="booking-details">
                <p><strong>Futsal:</strong> ${futsalName}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Date:</strong> ${new Date(bookingDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
              </div>
              <p>Please make sure to arrive a few minutes early. We look forward to seeing you!</p>
              <p>If you need to cancel, please do so within the given time frame.</p>
            </div>
            <div class="footer">
              <p>© 2024 KickHub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },
};

// Create and send booking confirmation notification
const sendBookingConfirmation = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate("user", "name email")
      .populate("futsal", "name location");

    if (!booking || !booking.user || !booking.futsal) {
      console.log("Booking or related data not found");
      return;
    }

    const { user, futsal, bookingDate, startTime, endTime } = booking;
    const emailHtml = emailTemplates.bookingConfirmation(
      user.name,
      futsal.name,
      bookingDate,
      startTime,
      endTime,
      futsal.location,
    );

    // Send email
    await sendEmail(user.email, "Booking Confirmed - KickHub", emailHtml);

    // Update booking to mark confirmation email as sent
    booking.confirmationEmailSent = true;
    booking.confirmationEmailSentAt = new Date();
    await booking.save();

    // Create in-app notification
    const notification = new Notification({
      user: user._id,
      type: "booking_confirmed",
      title: "Booking Confirmed",
      message: `Your booking at ${futsal.name} for ${new Date(bookingDate).toLocaleDateString()} is confirmed!`,
      bookingId: bookingId,
      isEmailNotification: true,
      emailSent: true,
      emailSentAt: new Date(),
    });

    await notification.save();
    console.log(`Confirmation email sent to ${user.email}`);
  } catch (error) {
    console.error("Error sending confirmation email:", error);
  }
};

// Create and send booking reminder notification (12 hours before)
const sendBookingReminder = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate("user", "name email")
      .populate("futsal", "name location");

    if (!booking || !booking.user || !booking.futsal) {
      console.log("Booking or related data not found");
      return;
    }

    // Don't send reminder if already sent
    if (booking.reminderEmailSent) {
      console.log("Reminder already sent for this booking");
      return;
    }

    const { user, futsal, bookingDate, startTime, endTime } = booking;
    const emailHtml = emailTemplates.bookingReminder(
      user.name,
      futsal.name,
      bookingDate,
      startTime,
      endTime,
      futsal.location,
    );

    // Send email
    await sendEmail(user.email, "Booking Reminder - KickHub", emailHtml);

    // Update booking to mark reminder email as sent
    booking.reminderEmailSent = true;
    booking.reminderEmailSentAt = new Date();
    await booking.save();

    // Create in-app notification
    const notification = new Notification({
      user: user._id,
      type: "booking_reminder",
      title: "Booking Reminder",
      message: `Your booking at ${futsal.name} is coming up in 12 hours!`,
      bookingId: bookingId,
      isEmailNotification: true,
      emailSent: true,
      emailSentAt: new Date(),
    });

    await notification.save();
    console.log(`Reminder email sent to ${user.email}`);
  } catch (error) {
    console.error("Error sending reminder email:", error);
  }
};

// Send cancellation notification
const sendBookingCancellation = async (bookingId, reason = "") => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate("user", "name email")
      .populate("futsal", "name location");

    if (!booking || !booking.user || !booking.futsal) {
      console.log("Booking or related data not found");
      return;
    }

    const { user, futsal } = booking;
    const cancellationReason = reason || "No reason provided";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .booking-details { background-color: #fff; padding: 15px; border-left: 4px solid #f44336; margin: 15px 0; }
            .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${user.name}</strong>,</p>
              <p>Your booking at <strong>${futsal.name}</strong> has been cancelled.</p>
              <div class="booking-details">
                <p><strong>Reason:</strong> ${cancellationReason}</p>
              </div>
              <p>If you have any questions, please contact us. We'd love to have you back!</p>
            </div>
            <div class="footer">
              <p>© 2024 KickHub. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    await sendEmail(user.email, "Booking Cancelled - KickHub", emailHtml);

    // Create in-app notification
    const notification = new Notification({
      user: user._id,
      type: "booking_cancelled",
      title: "Booking Cancelled",
      message: `Your booking at ${futsal.name} has been cancelled. Reason: ${cancellationReason}`,
      bookingId: bookingId,
      isEmailNotification: true,
      emailSent: true,
      emailSentAt: new Date(),
    });

    await notification.save();
    console.log(`Cancellation email sent to ${user.email}`);
  } catch (error) {
    console.error("Error sending cancellation email:", error);
  }
};

module.exports = {
  sendBookingConfirmation,
  sendBookingReminder,
  sendBookingCancellation,
};
