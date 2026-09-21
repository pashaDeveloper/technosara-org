const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const editionController = require("../controllers/edition.controller");

const router = express.Router();

router.get(
  "/all",
  editionController.getEditionOptions,
);
router.get(
  "/",
  editionController.getEditions,
);
router.get(
  "/:id",
  editionController.getEdition,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  editionController.addEdition,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  editionController.updateEdition,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  editionController.deleteEdition,
);

module.exports = router;
