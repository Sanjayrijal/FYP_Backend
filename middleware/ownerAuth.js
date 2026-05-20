const jwt = require("jsonwebtoken");
require("dotenv").config();

const ownerAuth = (req, res, next) => {
  let token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  // Ensure token is in "Bearer <token>" format
  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  } else {
    return res.status(401).json({ msg: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the token is for an owner
    if (decoded.role !== "owner") {
      return res
        .status(403)
        .json({ msg: "Access denied. Owner role required." });
    }

    req.owner = decoded; // { ownerId, role }
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    res.status(401).json({ msg: "Invalid or expired token" });
  }
};

module.exports = ownerAuth;
