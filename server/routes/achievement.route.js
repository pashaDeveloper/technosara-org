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
  require('../middleware/catalogValidate.middleware')('achievements'),
  achievementController.addAchievement,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  require('../middleware/catalogValidate.middleware')('achievements'),
  achievementController.updateAchievement,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  require('../middleware/catalogValidate.middleware')('achievements'),
  achievementController.deleteAchievement,
);

module.exports = router;
