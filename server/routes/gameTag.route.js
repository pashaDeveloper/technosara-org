const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const cloudinaryUpload = require("../middleware/cloudinaryUpload.middleware");
const gameTagController = require("../controllers/gameTag.controller");

const router = express.Router();
const gameTagUploadFields = [
  { name: "image", maxCount: 1 },
];

router.get(
  "/all",
  gameTagController.getGameTagOptions,
);
router.get(
  "/",
  gameTagController.getGameTags,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("game-tag").fields(gameTagUploadFields),
  cloudinaryUpload("game-tag").fields(gameTagUploadFields),
  gameTagController.createGameTag,
);
router.patch(
  "/reorder",
  verify,
  authorize("superAdmin", "admin"),
  gameTagController.reorderGameTag,
);
router.patch(
  "/localize",
  verify,
  authorize("superAdmin", "admin"),
  gameTagController.localizeGameTags,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("game-tag").fields(gameTagUploadFields),
  cloudinaryUpload("game-tag").fields(gameTagUploadFields),
  gameTagController.updateGameTag,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  gameTagController.deleteGameTag,
);
router.get(
  "/:id",
  gameTagController.getGameTag,
);

module.exports = router;
