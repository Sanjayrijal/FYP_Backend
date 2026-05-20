const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { scheduleReminderEmails } = require("./services/schedulerService");
const passport = require("./config/passport");
const expressSession = require("express-session");

// Initialize app
const app = express();

// Connect to database
connectDB();

// Initialize scheduler for sending reminder emails
scheduleReminderEmails();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files statically
app.use("/uploads", express.static("public/uploads"));

// Routes
const mainRoutes = require("./routes/index.routes");
const authRoutes = require("./routes/auth");
const futsalRoutes = require("./routes/futsal.routes");
const bookingRoutes = require("./routes/booking.routes");
const adminRoutes = require("./routes/admin.routes");
const userRoutes = require("./routes/user.routes");
const loyaltyRoutes = require("./routes/loyalty.routes");
const paymentRoutes = require("./routes/payment.routes");
const offerRoutes = require("./routes/offer.routes");

// NEW: Owner routes
const ownerAuthRoutes = require("./routes/owner.routes");
const ownerFutsalRoutes = require("./routes/ownerFutsal.routes");

// Base route
app.get("/", (req, res) => {
  res.send("🚀 API Running Successfully");
});

// API route groups
app.use("/api/v1", mainRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/futsals", futsalRoutes);
app.use("/api/futsal/booking", bookingRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/users", userRoutes);

// Loyalty routes (spins & coupons)
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/offers", offerRoutes);

// NEW: Owner routes
app.use("/api/owner/auth", ownerAuthRoutes);
app.use("/api/owner", ownerFutsalRoutes);

// Global error handler
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Payload too large. Please upload a smaller image.",
    });
  }

  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
