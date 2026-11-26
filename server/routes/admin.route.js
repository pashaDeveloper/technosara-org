const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const adminController = require("../controllers/admin.controller");

const router = express.Router();
const adminUploadFields = [{ name: "avatar", maxCount: 1 }];
const adminAccess = [verify, authorize("superAdmin", "admin")];
const ownerAccess = [...adminAccess, authorize("superAdmin")];
router.get('/api-tokens', ...ownerAccess, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ data: require('../services/apiTokens.service').status() });
});
router.post('/api-tokens', ...ownerAccess, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ data: await require('../services/apiTokens.service').check() });
  } catch (error) { next(error); }
});
router.patch('/api-tokens', ...ownerAccess, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ data: await require('../services/apiTokens.service').update(req.body) });
  } catch (error) { next(error); }
});
router.get('/api-tokens/arvan', ...ownerAccess, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ data: require('../services/apiTokens.service').arvanStatus() });
});
router.patch('/api-tokens/arvan', ...ownerAccess, async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ data: await require('../services/apiTokens.service').updateArvan(req.body) });
  } catch (error) { next(error); }
});

router.get(
  "/setup",
  adminController.getSetup,
);
router.post(
  "/sign-up",
  arvanUpload("admin").fields(adminUploadFields),
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
  adminController.signUp,
);
router.post(
  "/users",
  ...ownerAccess,
  arvanUpload("admin").fields(adminUploadFields),
  adminController.signUp,
);
router.delete(
  ["/delete-admin/:id", "/:id"],
  ...ownerAccess,
  adminController.deleteAdmin,
);

module.exports = router;
