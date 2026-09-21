const adminService = require("../services/admin.service");
const profileService = require("../services/profile.service");


exports.getSetup = async (req, res, next) => {
  try {
    res.status(200).json({ required: await adminService.needsSetup() });
  } catch (error) {
    next(error);
  }
};

exports.signUp = async (req, res, next) => {
  try {
    await adminService.signUp(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};

exports.signIn = async (req, res, next) => {
  try {
    await adminService.signIn(req, res);
  } catch (error) {
    next(error);
  }
};

exports.persistLogin = async (req, res, next) => {
  try {
    await adminService.persistLogin(req, res);
  } catch (error) {
    next(error);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    await adminService.deleteAdmin(req, res);
  } catch (error) {
    next(error);
  }
};

exports.updateAdmin = async (req, res, next) => {
  try {
    await adminService.updateAdmin(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};

exports.getAuthMethods = (req, res) => res.json({ oauthEnabled: false, passwordDisabled: false, providers: {}, autoLaunchProvider: null });
exports.updateAccount = async (req, res, next) => {
  try {
    await profileService.update(req, res);
  } catch (error) {
    if (req.rollbackUploads) await req.rollbackUploads().catch(cleanupError => console.error("[upload] rollback failed", cleanupError));
    next(error);
  }
};
exports.getSession = (req, res) => {
  const user = req.admin;
  res.json({ id: String(user._id), name: user.name, email: user.email, username: user.email, adminRole: user.role, role: 1, totpVerified: false, oauthProvider: null, hasPassword: true });
};
exports.logout = (req, res) => {
  res.clearCookie("technosara_admin_session", { path: "/" });
  res.json({ success: true });
};
