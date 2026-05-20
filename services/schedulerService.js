const cron = require("node-cron");
const Booking = require("../models/booking");
const { sendBookingReminder } = require("./notificationService");

// Schedule a job to check for bookings that need reminder emails
// This runs every 10 minutes
const scheduleReminderEmails = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      console.log("Checking for bookings that need reminder emails...");

      // Get all confirmed bookings that haven't sent reminder yet
      const bookings = await Booking.find({
        status: "confirmed",
        reminderEmailSent: false,
      }).populate("futsal");

      // Current time
      const now = new Date();

      // Check each booking
      for (const booking of bookings) {
        // Parse booking date and start time
        const bookingDate = new Date(booking.bookingDate);
        const [hours, minutes] = booking.startTime.split(":").map(Number);
        bookingDate.setHours(hours, minutes, 0, 0);

        // Calculate 12 hours before booking time
        const twelveHoursBefore = new Date(
          bookingDate.getTime() - 12 * 60 * 60 * 1000,
        );

        // Check if current time is within the reminder window
        // Send reminder if we're between 12 hours before and 12 hours + 10 minutes before
        const reminderWindowStart = new Date(
          twelveHoursBefore.getTime() - 10 * 60 * 1000,
        );
        const reminderWindowEnd = twelveHoursBefore;

        if (now >= reminderWindowStart && now <= reminderWindowEnd) {
          console.log(`Sending reminder for booking: ${booking._id}`);
          await sendBookingReminder(booking._id);
        }
      }
    } catch (error) {
      console.error("Error in reminder email scheduler:", error);
    }
  });

  console.log("Booking reminder email scheduler started");
};

module.exports = { scheduleReminderEmails };
