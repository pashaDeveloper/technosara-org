const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const mediaController = require("../controllers/media.controller");

const router = express.Router();

router.get(
  "/all",
  mediaController.getMediaOptions,
);
router.get(
  "/",
  mediaController.getMediaList,
);
router.get(
  "/:id",
  mediaController.getMedia,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  require('../middleware/catalogValidate.middleware')('media'),
  mediaController.addMedia,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  require('../middleware/catalogValidate.middleware')('media'),
  mediaController.updateMedia,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  require('../middleware/catalogValidate.middleware')('media'),
  mediaController.deleteMedia,
);

module.exports = router;
