const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const platformController = require("../controllers/platform.controller");

const router = express.Router();
const platformUploadFields = [
  { name: "logo", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
];

router.get(
  "/all",
  platformController.getPlatformOptions,
);
router.get(
  "/",
  platformController.getPlatforms,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("platform").fields(platformUploadFields),
  platformController.createPlatform,
);
router.patch(
  "/reorder",
  verify,
  authorize("superAdmin", "admin"),
  platformController.reorderPlatforms,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("platform").fields(platformUploadFields),
  platformController.updatePlatform,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  platformController.deletePlatform,
);
router.get(
  "/:id",
  platformController.getPlatform,
);

module.exports = router;
