const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const collectionController = require("../controllers/collection.controller");

const router = express.Router();
const collectionUploadFields = [
  { name: "image", maxCount: 1 },
];

router.get(
  "/all",
  collectionController.getCollectionOptions,
);
router.get(
  "/",
  collectionController.getCollections,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("collection").fields(collectionUploadFields),
  collectionController.createCollection,
);
router.patch(
  "/reorder",
  verify,
  authorize("superAdmin", "admin"),
  collectionController.reorderCollection,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("collection").fields(collectionUploadFields),
  collectionController.updateCollection,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  collectionController.deleteCollection,
);
router.get(
  "/:id",
  collectionController.getCollection,
);

module.exports = router;
