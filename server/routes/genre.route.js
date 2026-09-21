const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const cloudinaryUpload = require("../middleware/cloudinaryUpload.middleware");
const genreController = require("../controllers/genre.controller");

const router = express.Router();
const genreUploadFields = [
  { name: "image", maxCount: 1 },
];

router.get(
  "/all",
  genreController.getGenreOptions,
);
router.get(
  "/",
  genreController.getGenres,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("genre").fields(genreUploadFields),
  cloudinaryUpload("genre").fields(genreUploadFields),
  genreController.createGenre,
);
router.patch(
  "/reorder",
  verify,
  authorize("superAdmin", "admin"),
  genreController.reorderGenre,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("genre").fields(genreUploadFields),
  cloudinaryUpload("genre").fields(genreUploadFields),
  genreController.updateGenre,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  genreController.deleteGenre,
);
router.get(
  "/:id",
  genreController.getGenre,
);

module.exports = router;
