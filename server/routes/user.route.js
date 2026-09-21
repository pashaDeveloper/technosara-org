const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const userController = require("../controllers/user.controller");

const router = express.Router();

router.get(
  "/all",
  userController.getUserOptions,
);
router.get(
  "/",
  userController.getUsers,
);
router.get(
  "/:id",
  userController.getUser,
);
router.post(
  "/",
  verify,
  authorize("superAdmin"),
  userController.addUser,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin"),
  userController.updateUser,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin"),
  userController.deleteUser,
);

module.exports = router;
