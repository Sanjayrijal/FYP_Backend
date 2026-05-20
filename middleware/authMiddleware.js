const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

module.exports = (req, res, next) => {
  let token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  } else {
    return res.status(401).json({ msg: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid or expired token" });
  }
};

// Verified User Middleware - Checks if user is verified
const verifiedUserMiddleware = async (req, res, next) => {
  try {
    // authMiddleware should run first, so req.user should be available
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ msg: "No token, authorization denied" });
    }

    // Fetch user from database to check verification status
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Check if user is verified
    if (!user.verified) {
      return res.status(403).json({
        msg: "You must verify your email before performing this action",
        verified: false,
      });
    }

    // Attach user to request for further use
    req.user.userDetails = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server Error" });
  }
};

module.exports.verifiedUserMiddleware = verifiedUserMiddleware;
