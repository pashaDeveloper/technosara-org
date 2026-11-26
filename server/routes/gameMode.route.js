const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const gameModeController = require("../controllers/gameMode.controller");

const router = express.Router();
const gameModeUploadFields = [
  { name: "image", maxCount: 1 },
];

router.get(
  "/all",
  gameModeController.getGameModeOptions,
);
router.get(
  "/",
  gameModeController.getGameModes,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("game-modes").fields(gameModeUploadFields),
  gameModeController.createGameMode,
);
router.patch(
  "/reorder",
  verify,
  authorize("superAdmin", "admin"),
  gameModeController.reorderGameMode,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("game-modes").fields(gameModeUploadFields),
  gameModeController.updateGameMode,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  gameModeController.deleteGameMode,
);
router.get(
  "/:id",
  gameModeController.getGameMode,
);

module.exports = router;
