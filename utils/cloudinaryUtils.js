const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

// Upload single file to Cloudinary
const uploadToCloudinary = async (filePath, folder = "kickhub") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: "auto",
    });

    // Delete local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

// Upload multiple files to Cloudinary
const uploadMultipleToCloudinary = async (
  filePaths,
  folder = "kickhub/futsals",
) => {
  try {
    const uploadPromises = filePaths.map((filePath) =>
      uploadToCloudinary(filePath, folder),
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Cloudinary multiple upload error:", error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
};
