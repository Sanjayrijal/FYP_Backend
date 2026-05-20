const User = require("../models/User");

const SAFE_USER_FIELDS =
  "-password -resetToken -otp -otpExpiry -resetTokenExpiry";

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select(SAFE_USER_FIELDS);
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const {
      name,
      email,
      contactNumber,
      verified,
      profilePic,
      location,
      bio,
      dateOfBirth,
      gender,
      notificationPreferences,
    } = req.body;

    // Build update object with only provided fields
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (contactNumber !== undefined) updateFields.contactNumber = contactNumber;
    if (verified !== undefined) updateFields.verified = verified;
    if (profilePic !== undefined) updateFields.profilePic = profilePic;
    if (location !== undefined) updateFields.location = location;
    if (bio !== undefined) updateFields.bio = bio;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateFields.gender = gender;
    if (notificationPreferences !== undefined)
      updateFields.notificationPreferences = notificationPreferences;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields }, // use $set to only update specific fields
      { new: true, runValidators: true },
    ).select(SAFE_USER_FIELDS);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    return res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(SAFE_USER_FIELDS);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching own profile:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      contactNumber,
      profilePic,
      location,
      bio,
      dateOfBirth,
      gender,
      notificationPreferences,
    } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (contactNumber !== undefined) updateFields.contactNumber = contactNumber;
    if (profilePic !== undefined) updateFields.profilePic = profilePic;
    if (location !== undefined) updateFields.location = location;
    if (bio !== undefined) updateFields.bio = bio;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateFields.gender = gender;
    if (notificationPreferences !== undefined)
      updateFields.notificationPreferences = notificationPreferences;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateFields },
      { new: true, runValidators: true },
    ).select(SAFE_USER_FIELDS);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Error updating own profile:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's favorites
const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate("favorites")
      .select("favorites");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, data: user.favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Add futsal to favorites
const addFavorite = async (req, res) => {
  try {
    const { futsalId } = req.body;
    if (!futsalId)
      return res
        .status(400)
        .json({ success: false, message: "Futsal ID is required" });

    const user = await User.findById(req.user.userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Check if already in favorites
    if (user.favorites.includes(futsalId)) {
      return res
        .status(400)
        .json({ success: false, message: "Already in favorites" });
    }

    user.favorites.push(futsalId);
    await user.save();

    const updatedUser = await user.populate("favorites").then((u) => u);

    return res.status(200).json({ success: true, data: updatedUser.favorites });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Remove futsal from favorites
const removeFavorite = async (req, res) => {
  try {
    const { futsalId } = req.body;
    if (!futsalId)
      return res
        .status(400)
        .json({ success: false, message: "Futsal ID is required" });

    const user = await User.findById(req.user.userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Remove from favorites
    user.favorites = user.favorites.filter((id) => !id.equals(futsalId));
    await user.save();

    const updatedUser = await user.populate("favorites").then((u) => u);

    return res.status(200).json({ success: true, data: updatedUser.favorites });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser,
  getMyProfile,
  updateMyProfile,
  getFavorites,
  addFavorite,
  removeFavorite,
};
