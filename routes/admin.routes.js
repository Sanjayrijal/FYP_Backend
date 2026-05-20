const express = require("express");
const {
  createAdmin,
  adminLogin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} = require("../controllers/admin.controller");

const router = express.Router();

// Admin authentication
router.post("/login", adminLogin);

// Admin CRUD
router.post("/register", createAdmin);
router.get("/getAdmins", getAllAdmins);
router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

module.exports = router;
