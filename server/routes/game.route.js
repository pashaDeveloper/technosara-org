const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const gameController = require("../controllers/game.controller");

const router = express.Router();

router.get(
  "/all",
  gameController.getGameOptions,
);
router.get(
  "/",
  gameController.getGames,
);
router.get(
  "/:id",
  gameController.getGame,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  gameController.addGame,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  gameController.updateGame,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  gameController.deleteGame,
);

module.exports = router;
