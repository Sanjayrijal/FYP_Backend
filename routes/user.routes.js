const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  updateUser,
  deleteUser,
  deleteMyAccount,
  getMyProfile,
  updateMyProfile,
  getFavorites,
  addFavorite,
  removeFavorite,
} = require("../controllers/user.controller");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/me", authMiddleware, getMyProfile);
router.put("/me", authMiddleware, updateMyProfile);
router.delete("/me", authMiddleware, deleteMyAccount);

// Favorite management routes
router.get("/favorites", authMiddleware, getFavorites);
router.post("/favorites/add", authMiddleware, addFavorite);
router.post("/favorites/remove", authMiddleware, removeFavorite);

router.get("/", getAllUsers);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
