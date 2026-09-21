const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const cloudinaryUpload = require("../middleware/cloudinaryUpload.middleware");
const personController = require("../controllers/person.controller");

const router = express.Router();
const personUploadFields = [
  { name: "photo", maxCount: 1 },
];

router.get(
  "/countries",
  personController.getPersonCountries,
);
router.get(
  "/all",
  personController.getPersonOptions,
);
router.get(
  "/",
  personController.getPeople,
);
router.get(
  "/:id",
  personController.getPerson,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("person").fields(personUploadFields),
  cloudinaryUpload("person").fields(personUploadFields),
  personController.createPerson,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("person").fields(personUploadFields),
  cloudinaryUpload("person").fields(personUploadFields),
  personController.updatePerson,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  personController.deletePerson,
);

module.exports = router;
