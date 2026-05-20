const Offer = require("../models/Offer");
const Futsal = require("../models/Futsal");

// Create a new offer
exports.createOffer = async (req, res) => {
  try {
    const { title, description, discount, code, expiresAt, futsalId } =
      req.body;
    const ownerId = req.user.id;

    // Verify futsal belongs to owner
    const futsal = await Futsal.findOne({ _id: futsalId, owner: ownerId });
    if (!futsal) {
      return res
        .status(403)
        .json({ message: "Futsal not found or unauthorized" });
    }

    const offer = new Offer({
      title,
      description,
      discount,
      code: code.toUpperCase(),
      expiresAt,
      futsal: futsalId,
      owner: ownerId,
    });

    await offer.save();
    res
      .status(201)
      .json({ message: "Offer created successfully", data: offer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all offers for a futsal
exports.getOffersByFutsal = async (req, res) => {
  try {
    const { futsalId } = req.params;

    const offers = await Offer.find({ futsal: futsalId, isActive: true })
      .populate("futsal", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ data: offers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all offers for the logged-in owner
exports.getOwnerOffers = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const offers = await Offer.find({ owner: ownerId })
      .populate("futsal", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ data: offers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get offers for a specific owner's futsal
exports.getOwnerFutsalOffers = async (req, res) => {
  try {
    const { futsalId } = req.params;
    const ownerId = req.user.id;

    // Verify futsal belongs to owner
    const futsal = await Futsal.findOne({ _id: futsalId, owner: ownerId });
    if (!futsal) {
      return res
        .status(403)
        .json({ message: "Futsal not found or unauthorized" });
    }

    const offers = await Offer.find({ futsal: futsalId, owner: ownerId }).sort({
      createdAt: -1,
    });

    res.status(200).json({ data: offers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an offer
exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, discount, code, expiresAt } = req.body;
    const ownerId = req.user.id;

    const offer = await Offer.findById(id);
    if (!offer || offer.owner.toString() !== ownerId) {
      return res
        .status(403)
        .json({ message: "Offer not found or unauthorized" });
    }

    offer.title = title || offer.title;
    offer.description = description || offer.description;
    offer.discount = discount || offer.discount;
    offer.code = code ? code.toUpperCase() : offer.code;
    offer.expiresAt = expiresAt || offer.expiresAt;
    offer.updatedAt = new Date();

    await offer.save();
    res
      .status(200)
      .json({ message: "Offer updated successfully", data: offer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an offer (soft delete - set isActive to false)
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    const offer = await Offer.findById(id);
    if (!offer || offer.owner.toString() !== ownerId) {
      return res
        .status(403)
        .json({ message: "Offer not found or unauthorized" });
    }

    offer.isActive = false;
    await offer.save();

    res.status(200).json({ message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle offer active status
exports.toggleOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    const offer = await Offer.findById(id);
    if (!offer || offer.owner.toString() !== ownerId) {
      return res
        .status(403)
        .json({ message: "Offer not found or unauthorized" });
    }

    offer.isActive = !offer.isActive;
    offer.updatedAt = new Date();
    await offer.save();

    res.status(200).json({
      message: `Offer ${offer.isActive ? "activated" : "deactivated"}`,
      data: offer,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single offer by ID
exports.getOfferById = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id).populate("futsal", "name");
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.status(200).json({ data: offer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
