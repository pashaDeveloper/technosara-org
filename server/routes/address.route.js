const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const addressController = require("../controllers/address.controller");

const router = express.Router();

router.get(
  "/all",
  addressController.getAddressOptions,
);
router.get(
  "/",
  addressController.getAddresses,
);
router.get(
  "/:id",
  addressController.getAddress,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  addressController.addAddress,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  addressController.updateAddress,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  addressController.deleteAddress,
);

module.exports = router;
