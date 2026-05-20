const express = require("express");
const router = express.Router();
const {
  createFutsal,
  getAllFutsals,
  getFutsalById,
  updateFutsal,
  deleteFutsal,
} = require("../controllers/futsal.controller");

router.post("/addfutsal", createFutsal);
router.get("/getfutsals", getAllFutsals);
router.get("/:id", getFutsalById);
router.put("/:id", updateFutsal);
router.delete("/:id", deleteFutsal);

module.exports = router;
