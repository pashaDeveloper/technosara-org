const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const storeController = require("../controllers/store.controller");

const router = express.Router();
router.get('/countries', storeController.getStoreCountries);
const storeUploadFields = [
  { name: "image", maxCount: 1 },
];

router.get(
  "/all",
  storeController.getStoreOptions,
);
router.get(
  "/",
  storeController.getStores,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("store").fields(storeUploadFields),
  storeController.createStore,
);
router.patch(
  "/reorder",
  verify,
  authorize("superAdmin", "admin"),
  storeController.reorderStore,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("store").fields(storeUploadFields),
  storeController.updateStore,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  storeController.deleteStore,
);
router.get(
  "/:id",
  storeController.getStore,
);

module.exports = router;
