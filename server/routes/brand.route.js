const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const cloudinaryUpload = require("../middleware/cloudinaryUpload.middleware");
const brandController = require("../controllers/brand.controller");

const router = express.Router();
const brandUploadFields = [
  { name: "logo", maxCount: 1 },
];

router.get(
  "/countries",
  brandController.getBrandCountries,
);
router.get(
  "/all",
  brandController.getBrandOptions,
);
router.get(
  "/",
  brandController.getBrands,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("brand").fields(brandUploadFields),
  cloudinaryUpload("brand").fields(brandUploadFields),
  brandController.createBrand,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("brand").fields(brandUploadFields),
  cloudinaryUpload("brand").fields(brandUploadFields),
  brandController.updateBrand,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  brandController.deleteBrand,
);
router.get(
  "/:id",
  brandController.getBrand,
);

module.exports = router;
