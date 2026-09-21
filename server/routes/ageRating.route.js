const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const ageRatingController = require("../controllers/ageRating.controller");

const router = express.Router();

router.get(
  "/all",
  ageRatingController.getAgeRatingOptions,
);
router.get(
  "/",
  ageRatingController.getAgeRatings,
);
router.get(
  "/:id",
  ageRatingController.getAgeRating,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  ageRatingController.addAgeRating,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  ageRatingController.updateAgeRating,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  ageRatingController.deleteAgeRating,
);

module.exports = router;
