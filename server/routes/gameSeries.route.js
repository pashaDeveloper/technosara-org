const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const gameSeriesController = require("../controllers/gameSeries.controller");

const router = express.Router();
const gameSeriesUploadFields = [
  { name: "image", maxCount: 1 },
];

router.get(
  "/all",
  gameSeriesController.getGameSeriesOptions,
);
router.get(
  "/",
  gameSeriesController.getGameSeriesEntries,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("game-series").fields(gameSeriesUploadFields),
  gameSeriesController.createGameSeries,
);
router.patch(
  "/reorder",
  verify,
  authorize("superAdmin", "admin"),
  gameSeriesController.reorderGameSeries,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("game-series").fields(gameSeriesUploadFields),
  gameSeriesController.updateGameSeries,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  gameSeriesController.deleteGameSeries,
);
router.get(
  "/:id",
  gameSeriesController.getGameSeries,
);

module.exports = router;
