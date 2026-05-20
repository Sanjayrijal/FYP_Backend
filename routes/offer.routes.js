const express = require("express");
const {
  createOffer,
  getOffersByFutsal,
  getOwnerOffers,
  getOwnerFutsalOffers,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getOfferById,
} = require("../controllers/offer.controller");
const ownerAuth = require("../middleware/ownerAuth");

const router = express.Router();

// Get offers for a specific futsal (public route)
router.get("/futsal/:futsalId", getOffersByFutsal);

// Get single offer by ID (public route)
router.get("/:id", getOfferById);

// Protected routes (owner only)
router.post("/create", ownerAuth, createOffer);
router.get("/owner/all", ownerAuth, getOwnerOffers);
router.get("/owner/futsal/:futsalId", ownerAuth, getOwnerFutsalOffers);
router.put("/:id", ownerAuth, updateOffer);
router.delete("/:id", ownerAuth, deleteOffer);
router.patch("/:id/toggle", ownerAuth, toggleOfferStatus);

module.exports = router;
