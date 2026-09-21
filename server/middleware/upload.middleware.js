const uploadArvan = require("./arvanUpload.middleware");
const uploadCloudinary = require("./cloudinaryUpload.middleware");
const imageUpload = require("../utils/imageUpload");

// Set IMAGE_UPLOAD_PROVIDER to arvan, cloudinary or both; routes can override it.
module.exports = (folder, provider = process.env.IMAGE_UPLOAD_PROVIDER || "arvan") => {
  if (provider === "arvan") return uploadArvan(folder);
  if (provider === "cloudinary") return uploadCloudinary(folder);
  return imageUpload(folder, provider);
};
