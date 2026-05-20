const Futsal = require("../models/Futsal");
const FutsalOwner = require("../models/Futsalowner");

// Create a new futsal
exports.createFutsal = async (req, res) => {
  try {
    const futsal = new Futsal(req.body);
    await futsal.save();
    res.status(201).json({
      success: true,
      message: "Futsal created successfully",
      data: futsal,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all futsals
exports.getAllFutsals = async (req, res) => {
  try {
    const futsals = await Futsal.find();
    res.status(200).json({ success: true, data: futsals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single futsal by ID
exports.getFutsalById = async (req, res) => {
  try {
    const futsal = await Futsal.findById(req.params.id);
    console.log(futsal);

    if (!futsal) {
      return res.status(404).json({
        success: false,
        message: "Futsal not found",
      });
    }

    res.status(200).json({ success: true, data: futsal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a futsal by ID
exports.updateFutsal = async (req, res) => {
  try {
    const futsal = await Futsal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!futsal) {
      return res.status(404).json({
        success: false,
        message: "Futsal not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Futsal updated successfully",
      data: futsal,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a futsal by ID
exports.deleteFutsal = async (req, res) => {
  try {
    const reason = String(req.body?.deletionReason || "").trim();
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Deletion reason is required",
      });
    }

    const futsal = await Futsal.findById(req.params.id);

    if (!futsal) {
      return res.status(404).json({
        success: false,
        message: "Futsal not found",
      });
    }

    if (futsal.owner) {
      await FutsalOwner.findByIdAndUpdate(futsal.owner, {
        $push: {
          notifications: {
            type: "futsal_deleted",
            title: "Futsal removed by admin",
            message: `Your futsal \"${futsal.name}\" was deleted by admin. Reason: ${reason}`,
            futsalName: futsal.name,
            reason,
            read: false,
          },
        },
      });
    }

    await Futsal.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Futsal deleted successfully",
      deletionReason: reason,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
