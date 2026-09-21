const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const achievementGroupController = require("../controllers/achievementGroup.controller");

const router = express.Router();

router.get(
  "/all",
  achievementGroupController.getAchievementGroupOptions,
);
router.get(
  "/",
  achievementGroupController.getAchievementGroups,
);
router.get(
  "/:id",
  achievementGroupController.getAchievementGroup,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  achievementGroupController.addAchievementGroup,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  achievementGroupController.updateAchievementGroup,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  achievementGroupController.deleteAchievementGroup,
);

module.exports = router;
