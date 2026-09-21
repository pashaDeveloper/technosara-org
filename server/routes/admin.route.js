const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const cloudinaryUpload = require("../middleware/cloudinaryUpload.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();
const adminUploadFields = [{ name: "avatar", maxCount: 1 }];
const adminAccess = [verify, authorize("superAdmin", "admin")];
const ownerAccess = [...adminAccess, authorize("superAdmin")];

router.get(
  "/setup",
  adminController.getSetup,
);
router.post(
  "/sign-up",
  arvanUpload("admin").fields(adminUploadFields),
  cloudinaryUpload("admin").fields(adminUploadFields),
  adminController.signUp,
);
router.post(
  "/sign-in",
  adminController.signIn,
);
router.get(
  "/me",
  ...adminAccess,
  adminController.persistLogin,
);
router.patch(
  ["/me", "/update-information"],
  ...adminAccess,
  arvanUpload("admin").fields(adminUploadFields),
  cloudinaryUpload("admin").fields(adminUploadFields),
  adminController.updateAdmin,
);
router.get(
  "/auth/methods",
  adminController.getAuthMethods,
);
router.get(
  "/account/setup",
  adminController.getSetup,
);
router.post(
  ["/auth/password", "/account/login"],
  adminController.signIn,
);
router.get(
  "/account/me",
  ...adminAccess,
  adminController.persistLogin,
);
router.patch(
  "/account/me",
  ...adminAccess,
  arvanUpload("admin").fields(adminUploadFields),
  cloudinaryUpload("admin").fields(adminUploadFields),
  adminController.updateAccount,
);
router.get(
  "/session",
  ...adminAccess,
  adminController.getSession,
);
router.post(
  "/account/logout",
  ...adminAccess,
  adminController.logout,
);
router.delete(
  "/session",
  ...adminAccess,
  adminController.logout,
);
router.post(
  ["/setup/2", "/account/register"],
  arvanUpload("admin").fields(adminUploadFields),
  cloudinaryUpload("admin").fields(adminUploadFields),
  adminController.signUp,
);
router.post(
  "/users",
  ...ownerAccess,
  arvanUpload("admin").fields(adminUploadFields),
  cloudinaryUpload("admin").fields(adminUploadFields),
  adminController.signUp,
);
router.delete(
  ["/delete-admin/:id", "/:id"],
  ...ownerAccess,
  adminController.deleteAdmin,
);

module.exports = router;
