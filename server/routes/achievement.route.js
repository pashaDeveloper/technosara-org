const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const achievementController = require("../controllers/achievement.controller");

const router = express.Router();

router.get(
  "/all",
  achievementController.getAchievementOptions,
);
router.get(
  "/",
  achievementController.getAchievements,
);
router.get(
  "/:id",
  achievementController.getAchievement,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  achievementController.addAchievement,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  achievementController.updateAchievement,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  achievementController.deleteAchievement,
);

module.exports = router;
