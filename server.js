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
const isProduction = process.env.NODE_ENV === "production";

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.FRONTEND_URL) {
  configuredOrigins.push(process.env.FRONTEND_URL.trim());
}

const allowedOrigins = [...new Set(configuredOrigins)];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server and same-origin requests without Origin header.
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0) {
      if (!isProduction) return callback(null, true);
      return callback(new Error("CORS misconfiguration: no allowed origins"));
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS: origin not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

if (isProduction) {
  app.set("trust proxy", 1);
}

// Connect to database
connectDB();

// Initialize scheduler for sending reminder emails
scheduleReminderEmails();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET || "change-me-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "lax" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
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
  console.log(`Server running on port ${PORT}`);
  if (allowedOrigins.length > 0) {
    console.log(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
  }
});
