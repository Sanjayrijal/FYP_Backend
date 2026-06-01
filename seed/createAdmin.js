const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Admin = require("../models/admin");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existing = await Admin.findOne({ email: "sanjayrijal325@gmail.com" });
    if (existing) {
      console.log("Admin already exists. Deleting and recreating...");
      await Admin.deleteOne({ email: "sanjayrijal325@gmail.com" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin", salt);

    // Create admin
    const admin = new Admin({
      email: "sanjayrijal325@gmail.com",
      password: hashedPassword,
      role: "superadmin",
      isActive: true,
    });

    await admin.save();
    console.log("Admin created successfully");
    console.log("Email: sanjayrijal325@gmail.com");
    console.log("Password: admin");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
};

seedAdmin();