const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const exampleController = require("../controllers/example.controller");

const router = express.Router();

router.get(
  "/all",
  exampleController.getExampleOptions,
);
router.get(
  "/",
  exampleController.getExamples,
);
router.get(
  "/:id",
  exampleController.getExample,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  exampleController.addExample,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  exampleController.updateExample,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  exampleController.deleteExample,
);

module.exports = router;
