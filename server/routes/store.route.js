const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const storeController = require("../controllers/store.controller");

const router = express.Router();

router.get(
  "/all",
  storeController.getStoreOptions,
);
router.get(
  "/",
  storeController.getStores,
);
router.get(
  "/:id",
  storeController.getStore,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  storeController.addStore,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  storeController.updateStore,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  storeController.deleteStore,
);

module.exports = router;
